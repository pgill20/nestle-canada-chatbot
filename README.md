# Nestlé Canada AI Chatbot

An intelligent chatbot for the Made with Nestlé Canada website that provides real-time assistance to users by scraping website content and leveraging OpenAI's GPT technology.

## 🚀 Features

- **AI-Powered Responses**: Uses OpenAI GPT-3.5-turbo for intelligent conversations
- **Real-time Web Scraping**: Dynamically fetches content from madewithnestle.ca
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Customizable Interface**: Features the SMARTIE bot with Nestlé branding
- **Pop-out Functionality**: Expandable chat window with minimize/close controls
- **Chat History**: Saves recent conversations locally
- **Reference Links**: Provides relevant website links with responses

## 📋 Requirements Met

This chatbot fulfills all technical requirements from the specification:

✅ **Chatbot Design**: Customizable name (SMARTIE) and icon with pop-out feature  
✅ **Content Scraping**: Scrapes website content including text, links, and images  
✅ **AI Integration**: OpenAI API integration for intelligent responses  
✅ **Azure Deployment**: Ready for Azure App Service deployment  
✅ **Responsive UI**: Mobile-friendly design with modern interface  
✅ **Real-time Updates**: Dynamic content fetching and knowledge base refresh  

## 🏗️ Project Structure

```
nestle-chatbot/
├── app.py                 # Main Flask application
├── requirements.txt       # Python dependencies
├── startup.sh            # Azure startup script
├── .env                  # Environment variables (create this)
├── templates/
│   └── index.html        # Main HTML template
├── static/
│   ├── style.css         # Stylesheet
│   ├── script.js         # JavaScript functionality
│   ├── nestle-website-screenshot.jpg  # Background image
│   └── favicon.ico       # Site favicon
└── README.md            # This file
```

## 🛠️ Local Development Setup

### Prerequisites

- Python 3.8 or higher
- pip (Python package installer)
- OpenAI API key

### Step-by-Step Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd nestle-chatbot
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env file and add your OpenAI API key
   ```

5. **Add background image**
   - Take a screenshot of https://www.madewithnestle.ca/
   - Save it as `static/nestle-website-screenshot.jpg`
   - Recommended size: 1920x1080px

6. **Run the application**
   ```bash
   python app.py
   ```

7. **Access the chatbot**
   - Open http://localhost:5000 in your browser
   - Click the SMARTIE button to start chatting

## ☁️ Azure Deployment Guide

### Prerequisites

- Azure account with active subscription
- Azure CLI installed locally

### Step-by-Step Azure Deployment

1. **Create Azure App Service**
   ```bash
   # Login to Azure
   az login
   
   # Create resource group
   az group create --name nestle-chatbot-rg --location "East US"
   
   # Create App Service plan
   az appservice plan create --name nestle-chatbot-plan --resource-group nestle-chatbot-rg --sku B1 --is-linux
   
   # Create web app
   az webapp create --resource-group nestle-chatbot-rg --plan nestle-chatbot-plan --name nestle-chatbot-app --runtime "PYTHON|3.9"
   ```

2. **Configure Application Settings**
   ```bash
   # Set OpenAI API key
   az webapp config appsettings set --resource-group nestle-chatbot-rg --name nestle-chatbot-app --settings OPENAI_API_KEY="your-api-key-here"
   
   # Set startup file
   az webapp config set --resource-group nestle-chatbot-rg --name nestle-chatbot-app --startup-file startup.sh
   ```

3. **Deploy Code**
   
   **Option A: GitHub Actions (Recommended)**
   - Push code to GitHub repository
   - In Azure Portal, go to your Web App → Deployment Center
   - Connect to GitHub and select your repository
   - Azure will automatically build and deploy

   **Option B: Local Git Deployment**
   ```bash
   # Get deployment credentials
   az webapp deployment list-publishing-credentials --name nestle-chatbot-app --resource-group nestle-chatbot-rg
   
   # Add Azure remote
   git remote add azure https://<username>@nestle-chatbot-app.scm.azurewebsites.net/nestle-chatbot-app.git
   
   # Deploy
   git push azure main
   ```

4. **Access Your Deployed App**
   - URL: https://nestle-chatbot-app.azurewebsites.net

### Environment Variables in Azure

Set these in Azure Portal → App Service → Configuration → Application Settings:

- `OPENAI_API_KEY`: Your OpenAI API key
- `FLASK_ENV`: production
- `PORT`: 8000 (Azure default)
- `SECRET_KEY`: Generate a secure secret key

## 🔧 Configuration Options

### OpenAI Settings

Edit these in `app.py`:
- `model`: Change GPT model (gpt-3.5-turbo, gpt-4)
- `max_tokens`: Adjust response length
- `temperature`: Control response creativity (0.0-1.0)

### Scraping Settings

- `BASE_URL`: Website base URL to scrape
- `main_urls`: List of URLs to scrape for knowledge base
- Scraping frequency can be adjusted in the refresh methods

### UI Customization

- Colors: Edit CSS variables in `style.css`
- Bot name: Change "SMARTIE" references in HTML/JS
- Background: Replace `nestle-website-screenshot.jpg`

## 🧪 Testing

### Manual Testing
1. Open the application
2. Click the SMARTIE button
3. Test various queries:
   - "What products does Nestlé make?"
   - "Tell me about Nestlé's sustainability practices"
   - "Where can I buy Nestlé products?"
   - "What are some good recipes?"

### API Testing
```bash
# Health check
curl https://your-app-url.azurewebsites.net/health

# Chat endpoint
curl -X POST https://your-app-url.azurewebsites.net/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello SMARTIE!"}'
```

## 🔍 Monitoring and Logs

### Azure Monitoring
- Application Insights: Monitor performance and errors
- Log Stream: Real-time application logs
- Metrics: Track requests, response times, and errors

### Local Development Logs
```bash
# View Flask logs
tail -f app.log

# Debug mode
export FLASK_DEBUG=True
python app.py
```

## 🚨 Troubleshooting

### Common Issues

**"OpenAI API key not found"**
- Ensure OPENAI_API_KEY is set in environment variables
- Check .env file or Azure App Settings

**"Web scraping failed"**
- Check network connectivity
- Verify website URL accessibility
- Review rate limiting in scraper

**"Chatbot not responding"**
- Check browser console for JavaScript errors
- Verify Flask backend is running
- Test API endpoints directly

**"Azure deployment failed"**
- Check build logs in Azure Portal
- Verify all environment variables are set
- Ensure startup.sh has correct permissions

### Debug Commands

```bash
# Test web scraping locally
python -c "from app import NestleWebScraper; scraper = NestleWebScraper(); print(scraper.scrape_main_sections())"

# Test OpenAI connection
python -c "import openai; print(openai.Model.list())"

# Check Flask routes
python -c "from app import app; print(app.url_map)"
```

## 🔒 Security Considerations

- OpenAI API key stored securely in environment variables
- Input validation on chat messages
- Rate limiting to prevent abuse
- HTTPS enforced in production
- No sensitive data stored in chat history

## 📈 Future Enhancements

- **GraphRAG Integration**: Advanced relationship mapping
- **Vector Database**: Improved content search and retrieval
- **Multi-language Support**: French language support for Canada
- **Analytics Dashboard**: Usage statistics and insights
- **Voice Interface**: Speech-to-text integration
- **Mobile App**: Dedicated mobile application

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📜 License

This project is proprietary software developed for Nestlé Canada Inc.

## 📞 Support

For technical support or questions:
- Create an issue in the GitHub repository
- Contact the development team
- Check Azure Monitor for deployment issues

---

**Built with ❤️ for Nestlé Canada**