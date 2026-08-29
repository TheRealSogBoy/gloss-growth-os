import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rtgfncnkdfwiazzfosms.supabase.co';
const supabaseKey = 'sb_publishable_y1DrmaVw6y6ye4kh6bRUpA_YsOo2z6F';

export const supabase = createClient(supabaseUrl, supabaseKey);
