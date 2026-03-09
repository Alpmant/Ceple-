import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://heakdotuajtyyqlvvarw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlYWtkb3R1YWp0eXlxbHZ2YXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNTg4OTAsImV4cCI6MjA4ODYzNDg5MH0.50pWLHeyuzOjYr0bUA1oylv2-tx6Cddb9LNMH7_dFbY'

export const supabase = createClient(supabaseUrl, supabaseKey)
