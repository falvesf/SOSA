import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

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
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.user_metadata?.preferred_bimestre) {
          setSelectedBimestre(session.user.user_metadata.preferred_bimestre);
          localStorage.setItem('sosa_selected_bimestre', session.user.user_metadata.preferred_bimestre);
        }

        const { data, error } = await supabase.from('schools').select('*').order('name');
        if (error) throw error;
        
        setSchools(data || []);
        
        if (data && data.length > 0) {
          if (data.length === 1) {
            setSelectedSchoolId(data[0].id);
          } else {
            const savedSchoolId = localStorage.getItem('sosa_preferred_school_id');
            if (savedSchoolId && data.find(s => s.id === savedSchoolId)) {
              setSelectedSchoolId(savedSchoolId);
            } else {
              setSelectedSchoolId(data[0].id);
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
