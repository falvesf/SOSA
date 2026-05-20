import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { cacheMetadata, getCachedMetadata, withTimeout } from '../lib/offlineStore';

const SchoolContext = createContext();

export function SchoolProvider({ children }) {
  const [schools, setSchools] = useState([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [selectedBimestre, setSelectedBimestre] = useState(localStorage.getItem('sosa_selected_bimestre') || '1º Bimestre');
  const [loading, setLoading] = useState(true);
  
  // Scoping and Permission States
  const [userProfile, setUserProfile] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userScopes, setUserScopes] = useState([]);
  const [hasNoSchools, setHasNoSchools] = useState(false);

  async function init() {
    setLoading(true);
    try {
      let activeSession = null;
      if (navigator.onLine) {
        const { data: { session } } = await withTimeout(supabase.auth.getSession(), 1500).catch(() => ({ data: { session: null } }));
        activeSession = session;
        if (session?.user?.user_metadata?.preferred_bimestre) {
          setSelectedBimestre(session.user.user_metadata.preferred_bimestre);
          localStorage.setItem('sosa_selected_bimestre', session.user.user_metadata.preferred_bimestre);
        }
      }

      // Load Profile & Scopes
      let profile = null;
      let scopes = [];
      
      if (activeSession?.user) {
        if (navigator.onLine) {
          const { data: prof, error: profErr } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', activeSession.user.id)
            .maybeSingle();
            
          if (!prof) {
            // Check if any profiles exist in the system (bootstrap first user as superadmin)
            const { count, error: countErr } = await supabase
              .from('user_profiles')
              .select('*', { count: 'exact', head: true });
              
            const role = (count === 0) ? 'superadmin' : 'coordinator';
            
            const { data: newProf, error: insErr } = await supabase
              .from('user_profiles')
              .insert([{
                id: activeSession.user.id,
                email: activeSession.user.email,
                role: role
              }])
              .select()
              .single();
              
            profile = newProf;
          } else {
            profile = prof;
          }
          
          // Get user school scopes if not superadmin
          if (profile && profile.role !== 'superadmin') {
            const { data: scData } = await supabase
              .from('user_school_scopes')
              .select('school_id')
              .eq('user_id', activeSession.user.id);
            scopes = scData ? scData.map(s => s.school_id) : [];
          }
          
          // Cache in localStorage for offline availability
          localStorage.setItem('sosa_user_profile', JSON.stringify(profile));
          localStorage.setItem('sosa_user_scopes', JSON.stringify(scopes));
        } else {
          // Offline Fallback
          try {
            profile = JSON.parse(localStorage.getItem('sosa_user_profile') || 'null');
            scopes = JSON.parse(localStorage.getItem('sosa_user_scopes') || '[]');
          } catch (e) {
            console.error('Error loading profile from cache:', e);
          }
        }
      }

      setUserProfile(profile);
      setUserRole(profile?.role || null);
      setUserScopes(scopes);

      // Load Schools
      let schoolsData = [];
      try {
        if (!navigator.onLine) {
          throw new Error('Device is offline');
        }
        const { data, error } = await withTimeout(supabase.from('schools').select('*').order('name'), 2000);
        if (error) throw error;
        schoolsData = data || [];
        await cacheMetadata('schools', schoolsData);
      } catch (fetchError) {
        console.warn('Failed to fetch schools from Supabase, loading from offline cache:', fetchError);
        const cachedSchools = await getCachedMetadata('schools');
        if (cachedSchools) {
          schoolsData = cachedSchools;
        }
      }
      
      // Filter schools based on role & scopes
      let filteredSchools = schoolsData;
      if (profile && profile.role !== 'superadmin') {
        filteredSchools = schoolsData.filter(s => scopes.includes(s.id));
      }

      setSchools(filteredSchools);
      
      if (filteredSchools && filteredSchools.length > 0) {
        setHasNoSchools(false);
        if (filteredSchools.length === 1) {
          setSelectedSchoolId(filteredSchools[0].id);
        } else {
          const savedSchoolId = localStorage.getItem('sosa_preferred_school_id');
          if (savedSchoolId && filteredSchools.find(s => s.id === savedSchoolId)) {
            setSelectedSchoolId(savedSchoolId);
          } else {
            setSelectedSchoolId(filteredSchools[0].id);
          }
        }
      } else if (profile) {
        // Logged in but has no allowed schools
        setHasNoSchools(profile.role !== 'superadmin');
        setSelectedSchoolId('');
      } else {
        setHasNoSchools(false);
        setSelectedSchoolId('');
      }
    } catch (err) {
      console.error('Error in init:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    init();
  }, []);

  const updateBimestre = async (bimestre) => {
    setSelectedBimestre(bimestre);
    localStorage.setItem('sosa_selected_bimestre', bimestre);
    
    // Persist to database (User Metadata)
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.auth.updateUser({
        data: { preferred_bimestre: bimestre }
      });
    }
  };

  useEffect(() => {
    if (selectedSchoolId) {
      localStorage.setItem('sosa_preferred_school_id', selectedSchoolId);
    }
  }, [selectedSchoolId]);

  return (
    <SchoolContext.Provider value={{ 
      schools, 
      selectedSchoolId, 
      setSelectedSchoolId, 
      selectedBimestre, 
      updateBimestre,
      loading,
      userProfile,
      userRole,
      userScopes,
      hasNoSchools,
      reloadSchools: init
    }}>
      {children}
    </SchoolContext.Provider>
  );
}

export function useSchool() {
  return useContext(SchoolContext);
}
