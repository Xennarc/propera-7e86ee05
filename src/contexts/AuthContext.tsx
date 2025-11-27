import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { AppRole, Profile, GlobalRole, ResortRole, ResortMembership } from '@/types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  globalRole: GlobalRole;
  memberships: ResortMembership[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (roles: AppRole[]) => boolean;
  isSuperAdmin: () => boolean;
  hasResortRole: (resortId: string, roles: ResortRole[]) => boolean;
  getResortRole: (resortId: string) => ResortRole | null;
  refetchUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [globalRole, setGlobalRole] = useState<GlobalRole>('STANDARD');
  const [memberships, setMemberships] = useState<ResortMembership[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    // Fetch profile with global_role
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (profileData) {
      setProfile(profileData as Profile);
      setGlobalRole((profileData.global_role as GlobalRole) || 'STANDARD');
    }

    // Fetch legacy roles (for backwards compatibility)
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (rolesData) {
      setRoles(rolesData.map(r => r.role as AppRole));
    }

    // Fetch resort memberships
    const { data: membershipsData } = await supabase
      .from('resort_memberships')
      .select(`
        *,
        resort:resorts(*)
      `)
      .eq('user_id', userId);

    if (membershipsData) {
      setMemberships(membershipsData as ResortMembership[]);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer Supabase calls with setTimeout to avoid deadlock
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
          setGlobalRole('STANDARD');
          setMemberships([]);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserData(session.user.id);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setRoles([]);
    setGlobalRole('STANDARD');
    setMemberships([]);
  };

  const hasRole = (role: AppRole) => roles.includes(role);
  
  const hasAnyRole = (checkRoles: AppRole[]) => 
    checkRoles.some(role => roles.includes(role));

  const isSuperAdmin = () => globalRole === 'SUPER_ADMIN';

  const hasResortRole = (resortId: string, checkRoles: ResortRole[]) => {
    if (isSuperAdmin()) return true;
    const membership = memberships.find(m => m.resort_id === resortId);
    return membership ? checkRoles.includes(membership.resort_role) : false;
  };

  const getResortRole = (resortId: string): ResortRole | null => {
    const membership = memberships.find(m => m.resort_id === resortId);
    return membership?.resort_role || null;
  };

  const refetchUserData = async () => {
    if (user) {
      await fetchUserData(user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        roles,
        globalRole,
        memberships,
        loading,
        signIn,
        signUp,
        signOut,
        hasRole,
        hasAnyRole,
        isSuperAdmin,
        hasResortRole,
        getResortRole,
        refetchUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
