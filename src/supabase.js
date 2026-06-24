import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kibciojfrgqgbeccloet.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpYmNpb2pmcmdxZ2JlY2Nsb2V0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyNjE1NzUsImV4cCI6MjA5NzgzNzU3NX0.1l0rUqBj-VG2g4PLjdOknFaLcwLJqzdS3hi7QG5dNpg'

export const supabase = createClient(supabaseUrl, supabaseKey)