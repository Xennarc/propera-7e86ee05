import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Profile, GlobalRole, ResortRole, ResortMembership } from '@/types/database';
import { getBaseUrl } from '@/lib/url-utils';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  globalRole: GlobalRole;
  memberships: ResortMembership[];
  loading: boolean;
  userDataLoading: boolean; // True while fetching profile/memberships after auth
  isAccountDisabled: boolean; // True if account is disabled or deleted
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
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
  const [globalRole, setGlobalRole] = useState<GlobalRole>('STANDARD');
  const [memberships, setMemberships] = useState<ResortMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [userDataLoading, setUserDataLoading] = useState(false);
  const [isAccountDisabled, setIsAccountDisabled] = useState(false);

  const fetchUserData = async (userId: string) => {
    setUserDataLoading(true);
    try {
      // Fetch profile with global_role and disabled status
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData as Profile);
        setGlobalRole((profileData.global_role as GlobalRole) || 'STANDARD');
        
        // Check if account is disabled or deleted
        const disabled = Boolean(profileData.is_disabled) || Boolean(profileData.deleted_at);
        setIsAccountDisabled(disabled);
      }

      // Fetch resort memberships (single source of truth for resort roles)
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
    } finally {
      setUserDataLoading(false);
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
          setGlobalRole('STANDARD');
          setMemberships([]);
          setIsAccountDisabled(false);
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
    const redirectUrl = `${getBaseUrl()}/`;
    
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
    setGlobalRole('STANDARD');
    setMemberships([]);
    setIsAccountDisabled(false);
  };

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
        globalRole,
        memberships,
        loading,
        userDataLoading,
        isAccountDisabled,
        signIn,
        signUp,
        signOut,
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
