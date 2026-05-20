import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { cacheMetadata, getCachedMetadata, withTimeout } from '../lib/offlineStore';

const SchoolContext = createContext();

export function SchoolProvider({ children }) {
  const [schools, setSchools] = useState([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [selectedBimestre, setSelectedBimestre] = useState(localStorage.getItem('sosa_selected_bimestre') || '1º Bimestre');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        // Fetch User Metadata for Bimestre preference
        if (navigator.onLine) {
          const { data: { session } } = await withTimeout(supabase.auth.getSession(), 1500).catch(() => ({ data: { session: null } }));
          if (session?.user?.user_metadata?.preferred_bimestre) {
            setSelectedBimestre(session.user.user_metadata.preferred_bimestre);
            localStorage.setItem('sosa_selected_bimestre', session.user.user_metadata.preferred_bimestre);
          }
        }

        let schoolsData = [];
        try {
          if (!navigator.onLine) {
            throw new Error('Device is offline');
          }
          const { data, error } = await withTimeout(supabase.from('schools').select('*').order('name'), 2000);
          if (error) throw error;
          schoolsData = data || [];
          // Cache the schools list locally
          await cacheMetadata('schools', schoolsData);
        } catch (fetchError) {
          console.warn('Failed to fetch schools from Supabase, loading from offline cache:', fetchError);
          const cachedSchools = await getCachedMetadata('schools');
          if (cachedSchools) {
            schoolsData = cachedSchools;
          }
        }
        
        setSchools(schoolsData);
        
        if (schoolsData && schoolsData.length > 0) {
          if (schoolsData.length === 1) {
            setSelectedSchoolId(schoolsData[0].id);
          } else {
            const savedSchoolId = localStorage.getItem('sosa_preferred_school_id');
            if (savedSchoolId && schoolsData.find(s => s.id === savedSchoolId)) {
              setSelectedSchoolId(savedSchoolId);
            } else {
              setSelectedSchoolId(schoolsData[0].id);
            }
          }
        }
      } catch (err) {
        console.error('Error in init:', err);
      } finally {
        setLoading(false);
      }
    }
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
      loading 
    }}>
      {children}
    </SchoolContext.Provider>
  );
}

export function useSchool() {
  return useContext(SchoolContext);
}
