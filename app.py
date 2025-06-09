"""
Enhanced Flask Application for Nestlé Canada AI Chatbot
Includes location services, store locator, and Amazon integration

New Features Added:
- Location-based store finding
- Amazon product link integration
- Enhanced chatbot responses with location context
- Store locator with geolocation support

Enhanced for Nestlé Canada AI Assistant - Round 2 Technical Test
Author: Paramvir (Vick) Gill 
File: app.py (Enhanced Version)
"""

from flask import Flask, render_template, request, jsonify
from openai import OpenAI
import requests
from bs4 import BeautifulSoup
import os
from datetime import datetime
import json
import re
from urllib.parse import urljoin, urlparse
import logging
from dotenv import load_dotenv
import math

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# OpenAI API Configuration
api_key = os.getenv('OPENAI_API_KEY')
if api_key:
    openai_client = OpenAI(api_key=api_key)
    logger.info("OpenAI API key configured successfully")
else:
    openai_client = None
    logger.warning("OPENAI_API_KEY not found in environment variables")

# Nestlé website base URL
BASE_URL = "https://www.madewithnestle.ca"

# Product data with Amazon links
PRODUCT_DATA = {
    "kitkat": {
        "name": "KitKat",
        "description": "Crispy wafer bars covered in milk chocolate",
        "amazon_url": "https://www.amazon.ca/Kit-Kat-Chunky-Bar-42g/dp/B0742K5P6K",
        "categories": ["chocolate", "wafer", "snacks"],
        "available_sizes": ["42g", "4-pack", "Halloween pack"]
    },
    "smarties": {
        "name": "Smarties",
        "description": "Colorful candy-coated chocolate pieces",
        "amazon_url": "https://www.amazon.ca/Smarties-Milk-Chocolate-Pack-38g/dp/B078WTQXPZ",
        "categories": ["chocolate", "candy", "colorful"],
        "available_sizes": ["38g tube", "6-pack", "Party size"]
    },
    "quality street": {
        "name": "Quality Street",
        "description": "Premium assorted chocolates and toffees",
        "amazon_url": "https://www.amazon.ca/Quality-Street-Assorted-Chocolates-Toffees/dp/B075ZXQR4S",
        "categories": ["chocolate", "premium", "assorted", "gift"],
        "available_sizes": ["240g", "480g", "720g tin"]
    },
    "coffee crisp": {
        "name": "Coffee Crisp",
        "description": "Light, airy wafer with coffee-flavored cream",
        "amazon_url": "https://www.amazon.ca/Coffee-Crisp-Chocolate-Bar-50g/dp/B006GIQZXU",
        "categories": ["chocolate", "coffee", "wafer"],
        "available_sizes": ["50g", "4-pack", "Fun size pack"]
    },
    "aero": {
        "name": "Aero",
        "description": "Bubbly milk chocolate bar",
        "amazon_url": "https://www.amazon.ca/Aero-Milk-Chocolate-Bar-42g/dp/B0742JQXJ8",
        "categories": ["chocolate", "bubbly", "milk chocolate"],
        "available_sizes": ["42g", "4-pack", "Mini bars"]
    }
}

class EnhancedNestleWebScraper:
    def __init__(self):
        self.scraped_content = {}
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        self.product_count_cache = {}
    
    def scrape_page(self, url):
        """Scrape content from a single page"""
        try:
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Remove script and style elements
            for script in soup(["script", "style"]):
                script.decompose()
            
            # Extract text content
            text = soup.get_text()
            
            # Clean up text
            lines = (line.strip() for line in text.splitlines())
            chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
            text = ' '.join(chunk for chunk in chunks if chunk)
            
            # Extract product information for counting
            products = self.extract_products_from_page(soup)
            
            # Extract links
            links = []
            for link in soup.find_all('a', href=True):
                href = link['href']
                if href.startswith('/'):
                    href = urljoin(BASE_URL, href)
                if BASE_URL in href:
                    links.append({
                        'url': href,
                        'text': link.get_text(strip=True)
                    })
            
            # Extract images
            images = []
            for img in soup.find_all('img', src=True):
                src = img['src']
                if src.startswith('/'):
                    src = urljoin(BASE_URL, src)
                images.append({
                    'src': src,
                    'alt': img.get('alt', ''),
                    'title': img.get('title', '')
                })
            
            return {
                'url': url,
                'title': soup.title.string if soup.title else '',
                'text': text,
                'links': links,
                'images': images,
                'products': products,
                'scraped_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error scraping {url}: {str(e)}")
            return None
    
    def extract_products_from_page(self, soup):
        """Extract product information for structured queries"""
        products = []
        
        # Look for product cards, product listings, etc.
        product_selectors = [
            '.product-card', '.product-item', '.product-tile',
            '[data-product]', '.recipe-card', '.recipe-item'
        ]
        
        for selector in product_selectors:
            elements = soup.select(selector)
            for element in elements:
                product_name = self.extract_product_name(element)
                if product_name:
                    products.append({
                        'name': product_name,
                        'category': self.categorize_product(product_name),
                        'url': self.extract_product_url(element)
                    })
        
        return products
    
    def extract_product_name(self, element):
        """Extract product name from HTML element"""
        # Try different methods to extract product name
        name_selectors = ['h3', 'h4', '.product-title', '.product-name', '[data-product-name]']
        
        for selector in name_selectors:
            name_element = element.select_one(selector)
            if name_element:
                return name_element.get_text(strip=True)
        
        # Fallback to element text
        text = element.get_text(strip=True)
        if len(text) < 100:  # Reasonable product name length
            return text
        
        return None
    
    def categorize_product(self, product_name):
        """Categorize product based on name"""
        product_lower = product_name.lower()
        
        if any(word in product_lower for word in ['coffee', 'espresso', 'nescafe']):
            return 'coffee'
        elif any(word in product_lower for word in ['kitkat', 'smarties', 'aero', 'quality']):
            return 'chocolate'
        elif any(word in product_lower for word in ['recipe', 'baking', 'cookie']):
            return 'recipe'
        else:
            return 'other'
    
    def extract_product_url(self, element):
        """Extract product URL from element"""
        link = element.find('a', href=True)
        if link:
            href = link['href']
            if href.startswith('/'):
                href = urljoin(BASE_URL, href)
            return href
        return None
    
    def scrape_main_sections(self):
        """Scrape main sections of the Nestlé website"""
        main_urls = [
            f"{BASE_URL}/",
            f"{BASE_URL}/search/products",
            f"{BASE_URL}/search/recipes",
            f"{BASE_URL}/help",
            f"{BASE_URL}/about",
            f"{BASE_URL}/sustainability"
        ]
        
        total_products = 0
        products_by_category = {}
        
        for url in main_urls:
            content = self.scrape_page(url)
            if content:
                self.scraped_content[url] = content
                
                # Count products
                if content.get('products'):
                    total_products += len(content['products'])
                    
                    for product in content['products']:
                        category = product.get('category', 'other')
                        if category not in products_by_category:
                            products_by_category[category] = 0
                        products_by_category[category] += 1
                
                logger.info(f"Successfully scraped {url}")
        
        # Cache product counts
        self.product_count_cache = {
            'total_products': total_products,
            'products_by_category': products_by_category,
            'last_updated': datetime.now().isoformat()
        }
        
        return self.scraped_content
    
    def get_product_counts(self):
        """Get cached product counts"""
        return self.product_count_cache

class EnhancedNestleChatbot:
    def __init__(self):
        self.scraper = EnhancedNestleWebScraper()
        self.knowledge_base = {}
        self.refresh_knowledge()
    
    def refresh_knowledge(self):
        """Refresh the knowledge base by scraping the website"""
        try:
            self.knowledge_base = self.scraper.scrape_main_sections()
            logger.info("Knowledge base refreshed successfully")
        except Exception as e:
            logger.error(f"Error refreshing knowledge base: {str(e)}")
    
    def search_knowledge_base(self, query):
        """Search through scraped content for relevant information"""
        relevant_content = []
        query_lower = query.lower()
        
        for url, content in self.knowledge_base.items():
            if content and content.get('text'):
                text_lower = content['text'].lower()
                
                # Simple relevance scoring
                score = 0
                query_words = query_lower.split()
                for word in query_words:
                    if word in text_lower:
                        score += text_lower.count(word)
                
                if score > 0:
                    relevant_content.append({
                        'url': url,
                        'title': content.get('title', ''),
                        'text': content['text'][:500] + '...' if len(content['text']) > 500 else content['text'],
                        'score': score,
                        'links': content.get('links', [])[:3],
                        'products': content.get('products', [])
                    })
        
        # Sort by relevance score
        relevant_content.sort(key=lambda x: x['score'], reverse=True)
        return relevant_content[:3]
    
    def detect_query_type(self, user_message):
        """Detect the type of query to provide appropriate response"""
        message_lower = user_message.lower()
        
        # Location-based queries
        location_keywords = ['near me', 'nearby', 'close by', 'where can i buy', 'stores near', 'in my area']
        if any(keyword in message_lower for keyword in location_keywords):
            return 'location'
        
        # Product count queries
        count_keywords = ['how many', 'count', 'number of', 'total products']
        if any(keyword in message_lower for keyword in count_keywords):
            return 'count'
        
        # Amazon/purchase queries
        purchase_keywords = ['buy online', 'amazon', 'purchase', 'order online']
        if any(keyword in message_lower for keyword in purchase_keywords):
            return 'purchase'
        
        return 'general'
    
    def extract_product_from_message(self, message):
        """Extract product name from user message"""
        message_lower = message.lower()
        
        for product_key, product_data in PRODUCT_DATA.items():
            if product_key in message_lower or product_data['name'].lower() in message_lower:
                return product_key, product_data
        
        return None, None
    
    def handle_count_query(self, user_message):
        """Handle product count queries"""
        message_lower = user_message.lower()
        product_counts = self.scraper.get_product_counts()
        
        if not product_counts:
            return "I don't have current product count information. Let me refresh my knowledge base and try again."
        
        # Check for specific categories
        if 'coffee' in message_lower:
            coffee_count = product_counts.get('products_by_category', {}).get('coffee', 0)
            return f"Based on my latest scan of the Made with Nestlé Canada website, I found {coffee_count} coffee-related products listed."
        
        elif 'chocolate' in message_lower:
            chocolate_count = product_counts.get('products_by_category', {}).get('chocolate', 0)
            return f"I found {chocolate_count} chocolate products currently listed on the website."
        
        elif 'recipe' in message_lower:
            recipe_count = product_counts.get('products_by_category', {}).get('recipe', 0)
            return f"There are {recipe_count} recipes currently available on the Made with Nestlé Canada website."
        
        else:
            total_count = product_counts.get('total_products', 0)
            categories = product_counts.get('products_by_category', {})
            
            response = f"Based on my latest scan, I found {total_count} total products/items on the Made with Nestlé Canada website.\n\n"
            response += "Breakdown by category:\n"
            for category, count in categories.items():
                response += f"• {category.title()}: {count} items\n"
            
            response += f"\n*Last updated: {product_counts.get('last_updated', 'Unknown')}*"
            return response
    
    def handle_purchase_query(self, user_message):
        """Handle purchase/Amazon queries"""
        product_key, product_data = self.extract_product_from_message(user_message)
        
        if product_data:
            response = f"You can purchase {product_data['name']} online:\n\n"
            response += f"🛒 **Amazon Canada**: [{product_data['name']}]({product_data['amazon_url']})\n\n"
            response += f"📦 Available sizes: {', '.join(product_data['available_sizes'])}\n\n"
            response += "💡 *Tip: Check for local availability and delivery options at checkout.*"
            return response
        else:
            response = "You can find Nestlé products online at various retailers:\n\n"
            response += "🛒 **Amazon Canada**: Wide selection of Nestlé products\n"
            response += "🏪 **Major grocery chains**: Loblaws, Metro, Walmart\n"
            response += "🛍️ **Online grocery**: Instacart, PC Express\n\n"
            response += "Would you like me to help you find a specific product?"
            return response
    
    def generate_response(self, user_message, user_location=None):
        """Generate chatbot response using OpenAI and scraped content"""
        try:
            # Check if OpenAI client is available
            if not openai_client:
                return "I'm sorry, the AI service is currently unavailable. Please try again later or visit www.madewithnestle.ca for more information."
            
            # Detect query type
            query_type = self.detect_query_type(user_message)
            
            # Handle specific query types
            if query_type == 'count':
                return self.handle_count_query(user_message)
            elif query_type == 'purchase':
                return self.handle_purchase_query(user_message)
            elif query_type == 'location' and user_location:
                return self.handle_location_query(user_message, user_location)
            
            # Search knowledge base
            relevant_info = self.search_knowledge_base(user_message)
            
            # Prepare context from scraped content
            context = ""
            reference_links = []
            
            if relevant_info:
                context = "Based on information from the Made with Nestlé Canada website:\n\n"
                for info in relevant_info:
                    context += f"From {info['title']}: {info['text']}\n\n"
                    reference_links.extend(info['links'])
            
            # Create the prompt for OpenAI
            system_prompt = """You are SMARTIE, a helpful assistant for the Made with Nestlé Canada website. 
            You help users find information about Nestlé products, recipes, nutrition, sustainability practices, and general inquiries.
            
            Always be friendly, helpful, and provide accurate information based on the context provided.
            If you don't have specific information, suggest where users might find it on the website.
            Keep responses conversational but informative.
            
            When providing information, always try to include relevant links when available.
            
            You can also help users find stores, purchase products online, and get product counts."""
            
            user_prompt = f"""User question: {user_message}
            
            Context from website:
            {context}
            
            Please provide a helpful response to the user's question. If you reference specific information, mention that it comes from the Made with Nestlé Canada website."""
            
            # Call OpenAI API
            response = openai_client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=500,
                temperature=0.7
            )
            
            bot_response = response.choices[0].message.content.strip()
            
            # Include reference links
            if reference_links:
                bot_response += "\n\nHere are some helpful links:\n"
                for link in reference_links[:2]:
                    if link['text'] and link['url']:
                        bot_response += f"• [{link['text']}]({link['url']})\n"
            
            return bot_response
            
        except Exception as e:
            logger.error(f"Error generating response: {str(e)}")
            return "I'm sorry, I'm having trouble processing your request right now. Please try again later or visit www.madewithnestle.ca for more information."
    
    def handle_location_query(self, user_message, user_location):
        """Handle location-based queries (placeholder for frontend implementation)"""
        # This will be primarily handled by the frontend LocationUI
        product_key, product_data = self.extract_product_from_message(user_message)
        
        if product_data:
            response = f"I can help you find stores near you that carry {product_data['name']}! "
            response += "The location service will show you nearby stores with distances and contact information. "
            response += f"You can also order online: [{product_data['name']} on Amazon]({product_data['amazon_url']})"
            return response
        else:
            return "I can help you find nearby stores that carry Nestlé products! Make sure location services are enabled and I'll show you the closest options with directions and contact details."

# Initialize enhanced chatbot
nestle_bot = EnhancedNestleChatbot()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json()
        user_message = data.get('message', '').strip()
        user_location = data.get('location')  # Optional location data from frontend
        
        if not user_message:
            return jsonify({'error': 'No message provided'}), 400
        
        # Generate response with location context if available
        bot_response = nestle_bot.generate_response(user_message, user_location)
        
        return jsonify({
            'response': bot_response,
            'timestamp': datetime.now().isoformat(),
            'query_type': nestle_bot.detect_query_type(user_message)
        })
        
    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/refresh-knowledge', methods=['POST'])
def refresh_knowledge():
    """Endpoint to refresh the knowledge base"""
    try:
        nestle_bot.refresh_knowledge()
        return jsonify({'status': 'success', 'message': 'Knowledge base refreshed'})
    except Exception as e:
        logger.error(f"Error refreshing knowledge: {str(e)}")
        return jsonify({'error': 'Failed to refresh knowledge base'}), 500

@app.route('/product-counts', methods=['GET'])
def get_product_counts():
    """Endpoint to get current product counts"""
    try:
        counts = nestle_bot.scraper.get_product_counts()
        return jsonify(counts)
    except Exception as e:
        logger.error(f"Error getting product counts: {str(e)}")
        return jsonify({'error': 'Failed to get product counts'}), 500

@app.route('/products', methods=['GET'])
def get_products():
    """Endpoint to get product information"""
    try:
        return jsonify(PRODUCT_DATA)
    except Exception as e:
        logger.error(f"Error getting products: {str(e)}")
        return jsonify({'error': 'Failed to get products'}), 500

@app.route('/health')
def health_check():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'features': {
            'location_services': True,
            'product_counts': True,
            'amazon_integration': True,
            'enhanced_rag': True
        }
    })

if __name__ == '__main__':
    # Refresh knowledge base on startup
    nestle_bot.refresh_knowledge()
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8000)), debug=False)