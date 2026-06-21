import { createClient } from '@supabase/supabase-js'
import { Platform } from 'react-native'

if (Platform.OS !== 'web') {
  require('react-native-url-polyfill/auto')
}

const getStorage = () => {
  if (Platform.OS === 'web') return undefined
  const AsyncStorage = require('@react-native-async-storage/async-storage').default
  return AsyncStorage
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: getStorage(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
})
