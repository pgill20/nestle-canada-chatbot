from flask import Flask, render_template, request, jsonify
import openai
import requests
from bs4 import BeautifulSoup
import os
from datetime import datetime
import json
import re
from urllib.parse import urljoin, urlparse
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# OpenAI API Configuration
api_key = os.getenv('OPENAI_API_KEY')
if api_key:
    openai.api_key = api_key
    logger.info("OpenAI API key configured successfully")
else:
    logger.warning("OPENAI_API_KEY not found in environment variables")

# Nestlé website base URL
BASE_URL = "https://www.madewithnestle.ca"

class NestleWebScraper:
    def __init__(self):
        self.scraped_content = {}
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
    
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
                'scraped_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error scraping {url}: {str(e)}")
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
        
        for url in main_urls:
            content = self.scrape_page(url)
            if content:
                self.scraped_content[url] = content
                logger.info(f"Successfully scraped {url}")
        
        return self.scraped_content

class NestleChatbot:
    def __init__(self):
        self.scraper = NestleWebScraper()
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
                        'links': content.get('links', [])[:3]  # Include top 3 relevant links
                    })
        
        # Sort by relevance score
        relevant_content.sort(key=lambda x: x['score'], reverse=True)
        return relevant_content[:3]  # Return top 3 most relevant results
    
    def generate_response(self, user_message):
        """Generate chatbot response using OpenAI and scraped content"""
        try:
            # Check if OpenAI API key is available
            if not openai.api_key:
                return "I'm sorry, the AI service is currently unavailable. Please try again later or visit www.madewithnestle.ca for more information."
            
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
            
            When providing information, always try to include relevant links when available."""
            
            user_prompt = f"""User question: {user_message}
            
            Context from website:
            {context}
            
            Please provide a helpful response to the user's question. If you reference specific information, mention that it comes from the Made with Nestlé Canada website."""
            
            # Call OpenAI API (using older v0.28.1 style)
            response = openai.ChatCompletion.create(
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
                for link in reference_links[:2]:  # Include top 2 links
                    if link['text'] and link['url']:
                        bot_response += f"• [{link['text']}]({link['url']})\n"
            
            return bot_response
            
        except Exception as e:
            logger.error(f"Error generating response: {str(e)}")
            return "I'm sorry, I'm having trouble processing your request right now. Please try again later or visit www.madewithnestle.ca for more information."

# Initialize chatbot
nestle_bot = NestleChatbot()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json()
        user_message = data.get('message', '').strip()
        
        if not user_message:
            return jsonify({'error': 'No message provided'}), 400
        
        # Generate response
        bot_response = nestle_bot.generate_response(user_message)
        
        return jsonify({
            'response': bot_response,
            'timestamp': datetime.now().isoformat()
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

@app.route('/health')
def health_check():
    return jsonify({'status': 'healthy', 'timestamp': datetime.now().isoformat()})

if __name__ == '__main__':
    # Refresh knowledge base on startup
    nestle_bot.refresh_knowledge()
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8000)), debug=False)