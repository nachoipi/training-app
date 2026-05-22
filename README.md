# Training App

A Web API training application built with Node.js, Express, HTML, CSS, and JavaScript.

## Features

- Express.js backend API
- Responsive web interface
- RESTful API endpoints
- Modern CSS styling with gradient design
- Vanilla JavaScript frontend

## Project Structure

```
training-app/
├── src/
│   └── server.js          # Express server and API endpoints
├── public/
│   ├── index.html         # Main HTML file
│   ├── style.css          # CSS styling
│   └── app.js             # Frontend JavaScript
├── .github/
│   └── copilot-instructions.md
├── package.json
├── .gitignore
└── README.md
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (comes with Node.js)

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

### Running the Application

Start the development server:
```bash
npm start
```

The application will be available at `http://localhost:3000`

## API Endpoints

### Status Endpoint
- **GET** `/api/status`
- Returns the current status of the API

### Health Endpoint
- **GET** `/api/health`
- Returns server health information

## Development

To modify the API, edit files in the `src/` directory.

To modify the frontend, edit files in the `public/` directory:
- `index.html` - Structure
- `style.css` - Styling
- `app.js` - Frontend logic

## License

MIT

## Author

Created as a training application
