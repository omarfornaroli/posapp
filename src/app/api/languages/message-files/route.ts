
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const messagesDir = path.join(process.cwd(), 'src', 'messages');
    let files: string[];
    try {
      files = await fs.readdir(messagesDir);
    } catch (error: any) {
      if (error.code === 'ENOENT') { // Directory doesn't exist
        files = []; // Treat as no files found
        await fs.mkdir(messagesDir, { recursive: true }); // Attempt to create it for next time
        console.log(`[API/languages/message-files] Created messages directory: ${messagesDir}`);
      } else {
        throw error; // Re-throw other errors
      }
    }
    
    const messageFiles = files
        .filter(file => file.endsWith('.json'))
        .map(file => ({ name: file, path: `src/messages/${file}` }));

    return NextResponse.json({ success: true, data: { messageFiles } });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error fetching message files';
    console.error("[API/languages/message-files] Error:", error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
