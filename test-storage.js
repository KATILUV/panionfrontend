// Simple test script to check file persistence
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDirectory = path.join(process.cwd(), 'panion_conversations');
const filePath = path.join(dataDirectory, 'conversations.json');

// Ensure directory exists
if (!fs.existsSync(dataDirectory)) {
  fs.mkdirSync(dataDirectory, { recursive: true });
  console.log(`Created directory: ${dataDirectory}`);
}

// Create some test data
const testData = {
  conversations: [
    {
      id: 1,
      sessionId: 'test-session-1',
      title: 'Test Conversation 1',
      createdAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      messageCount: 2
    }
  ],
  messages: [
    {
      sessionId: 'test-session-1',
      messages: [
        {
          id: 1,
          content: 'Hello, this is a test message',
          role: 'user',
          timestamp: new Date().toISOString(),
          sessionId: 'test-session-1',
          important: false,
          conversationMode: 'casual'
        },
        {
          id: 2,
          content: 'This is a response to the test message',
          role: 'assistant',
          timestamp: new Date().toISOString(),
          sessionId: 'test-session-1',
          important: false,
          conversationMode: 'casual'
        }
      ]
    }
  ]
};

// Write the test data to file
try {
  fs.writeFileSync(filePath, JSON.stringify(testData, null, 2));
  console.log(`Successfully wrote test data to ${filePath}`);
} catch (error) {
  console.error(`Failed to write test data: ${error.message}`);
}

// Read the file back to confirm it was written correctly
try {
  const fileData = fs.readFileSync(filePath, 'utf-8');
  const parsedData = JSON.parse(fileData);
  console.log('Read back data:');
  console.log(`Conversations: ${parsedData.conversations.length}`);
  console.log(`Message threads: ${parsedData.messages.length}`);
  console.log(`Messages in first thread: ${parsedData.messages[0].messages.length}`);
} catch (error) {
  console.error(`Failed to read test data: ${error.message}`);
}