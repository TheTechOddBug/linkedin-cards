import { ApifyClient } from 'apify-client';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env file
dotenv.config();

// Initialize the ApifyClient with API token
const client = new ApifyClient({
    token: process.env.APIFY_API_TOKEN,
});

// Prepare Actor input
const input = {
  "total_posts": 15,
  "username": "alexcerezocontreras",
  "page_number": 1,
  "limit": 100
};

(async () => {
    // Run the Actor and wait for it to finish
    const run = await client.actor("LQQIXN9Othf8f7R5n").call(input);

    // Fetch and print Actor results from the run's dataset (if any)
    console.log('Results from dataset');
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    
    // Save results to JSON file
    const outputPath = path.join(process.cwd(), 'data', 'linkedin-posts.json');
    const outputDir = path.dirname(outputPath);
    
    // Create data directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Write items to JSON file
    fs.writeFileSync(outputPath, JSON.stringify(items, null, 2), 'utf-8');
    console.log(`Los posts se han guardado en ${outputPath}`);
    
    // Also print to console
    items.forEach((item) => {
        console.dir(item);
    });
})();