import { createContext, useContext, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export type MembreRole = 'admin' | 'co-gestionnaire'

export interface Membre {
  id: string
  invited_by: string | null
  role: MembreRole
  nom: string
  prenom: string
  email: string
  created_at: string
}

interface AuthContextType {
  session: Session | null
  user: User | null
  membre: Membre | null
  role: MembreRole | null
  adminId: string | null  // uid effectif pour bailleur_id (admin=self, co-gest=invited_by)
  loading: boolean
  signOut: () => Promise<void>
  refreshMembre: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  session: null, user: null, membre: null, role: null, adminId: null,
  loading: true, signOut: async () => {}, refreshMembre: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [membre, setMembre] = useState<Membre | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchMembre(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchMembre(session.user.id)
      else { setMembre(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchMembre(userId: string) {
    const { data } = await supabase
      .from('patrimoine_membres')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (data) {
      setMembre(data)
    } else {
      // L'entrée est manquante (ex : email non confirmé lors du signUp).
      // On la crée automatiquement avec le rôle admin.
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: inserted } = await supabase
          .from('patrimoine_membres')
          .insert({
            id: userId,
            invited_by: userId,
            role: 'admin',
            nom: (user.user_metadata?.nom ?? '').toUpperCase() || 'UTILISATEUR',
            prenom: user.user_metadata?.prenom ?? '',
            email: user.email ?? '',
          })
          .select()
          .single()
        setMembre(inserted ?? null)
      } else {
        setMembre(null)
      }
    }
    setLoading(false)
  }

  async function refreshMembre() {
    if (session?.user.id) await fetchMembre(session.user.id)
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  const role = membre?.role ?? null
  const adminId = membre
    ? (membre.role === 'co-gestionnaire' ? membre.invited_by : membre.id)
    : (session?.user.id ?? null)

  return (
    <AuthContext.Provider value={{
      session, user: session?.user ?? null,
      membre, role, adminId, loading, signOut, refreshMembre,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
