import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase.js'

const AuthContext = createContext(null)

function mapProfileToUser(profile) {
  if (!profile) return null
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    role: profile.role,
    department: profile.department,
    designation: profile.designation,
    phone: profile.phone,
    status: profile.status,
    avatar: profile.avatar,
    createdAt: profile.created_at,
    lastLogin: profile.last_login,
  }
}

async function fetchProfile(userId) {
  if (!userId) return null
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) throw new Error(error.message)
  return mapProfileToUser(data)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    // On load, restore session (this is a real Supabase session, so it's
    // valid on any device you log in from — nothing is tied to one browser).
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!active) return
      if (session?.user) {
        try {
          setUser(await fetchProfile(session.user.id))
        } catch {
          setUser(null)
        }
      }
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!active) return
      if (session?.user) {
        try {
          setUser(await fetchProfile(session.user.id))
        } catch {
          setUser(null)
        }
      } else {
        setUser(null)
      }
    })

    return () => {
      active = false
      listener?.subscription?.unsubscribe()
    }
  }, [])

  const login = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
    const profile = await fetchProfile(data.user.id)
    if (profile.status === 'pending') {
      await supabase.auth.signOut()
      throw new Error('Your verifier account is awaiting admin approval.')
    }
    if (profile.status !== 'active') {
      await supabase.auth.signOut()
      throw new Error('Account is deactivated. Contact administrator.')
    }
    await supabase.from('profiles').update({ last_login: new Date().toISOString() }).eq('id', data.user.id)
    setUser(profile)
    return profile
  }, [])

  const register = useCallback(async (formData) => {
    let authUser = null
    let authSession = null

    const { data, error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          name: formData.name,
          role: formData.role || 'citizen',
          department: formData.department || 'panchayat',
          designation: formData.designation || '',
          phone: formData.phone || '',
        },
      },
    })

    if (error) {
      const msg = error.message || ''
      if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already exists')) {
        // If email exists in auth, try signing in with provided password
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        })
        if (!signInErr && signInData?.user) {
          authUser = signInData.user
          authSession = signInData.session
        } else {
          throw new Error('An account with this email address already exists. Please log in with your password.')
        }
      } else {
        throw new Error(msg)
      }
    } else {
      authUser = data?.user
      authSession = data?.session
    }

    if (!authUser) {
      throw new Error('Registration failed. Please check your details and try again.')
    }

    // Check if profile row exists in database
    let profile = await fetchProfile(authUser.id)

    // If profile row was deleted previously, automatically re-create it now
    if (!profile) {
      const newProfile = {
        id: authUser.id,
        name: formData.name,
        email: formData.email,
        role: formData.role || 'citizen',
        department: formData.department || 'panchayat',
        designation: formData.designation || '',
        phone: formData.phone || '',
        status: formData.role === 'verifier' ? 'pending' : 'active',
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
      }

      const { data: created, error: upsertErr } = await supabase
        .from('profiles')
        .upsert(newProfile)
        .select()
        .maybeSingle()

      if (upsertErr) {
        throw new Error(`Profile creation failed: ${upsertErr.message}`)
      }
      profile = mapProfileToUser(created)
    }

    if (!authSession && profile?.status === 'active') {
      // Try signing in to obtain active session
      try {
        const { data: sData } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        })
        if (sData?.session) authSession = sData.session
      } catch (_) {}
    }

    if (profile?.status === 'pending') {
      await supabase.auth.signOut()
      throw new Error('Account created. A verifier account needs admin approval before you can log in — check back once approved.')
    }

    setUser(profile)
    return profile
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
  }, [])

  const updateUser = useCallback(async (updated) => {
    const { id, ...fields } = updated
    // role/status are intentionally not sent here — only the Users page
    // (admin-only) touches those, and the database rejects the change
    // server-side anyway if the caller isn't an admin.
    const { role, status, email, createdAt, lastLogin, ...editable } = fields
    const dbFields = {
      name: editable.name,
      department: editable.department,
      designation: editable.designation,
      phone: editable.phone,
      avatar: editable.avatar,
    }
    const { data, error } = await supabase.from('profiles').update(dbFields).eq('id', id).select().single()
    if (error) throw new Error(error.message)
    const mapped = mapProfileToUser(data)
    setUser(mapped)
    return mapped
  }, [])

  const value = { user, loading, login, register, logout, updateUser }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
