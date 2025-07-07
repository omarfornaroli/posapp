
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';

export async function GET(request: Request, context: { params: { email: string } }) {
  const { email } = context.params;
  
  if (!email) {
    return NextResponse.json({ success: false, error: 'Email parameter is missing' }, { status: 400 });
  }

  await dbConnect();

  try {
    // Emails are stored in lowercase and trimmed in the DB, so ensure the query matches that.
    const user = await User.findOne({ email: decodeURIComponent(email).toLowerCase().trim() }); 
    
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    // Ensure virtuals like 'id' are applied if model is set up for it
    return NextResponse.json({ success: true, data: user.toObject({ virtuals: true }) });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
