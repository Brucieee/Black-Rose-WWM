
import { createClient } from '@supabase/supabase-js';

// Taken from your favicon URL
const supabaseUrl = 'https://hvfncvygrmnxfdavwzkx.supabase.co';

// Settings -> API -> Project API keys -> anon public
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2Zm5jdnlncm1ueGZkYXZ3emt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDg2ODQsImV4cCI6MjA3OTgyNDY4NH0.CGCXcIiJpBS_xKr8RvRFVMzFwLaOKn_0ndr4SG7UKLc';

export const supabase = createClient(supabaseUrl, supabaseKey);
