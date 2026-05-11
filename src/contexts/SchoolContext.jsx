import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const SchoolContext = createContext();

export function SchoolProvider({ children }) {
  const [schools, setSchools] = useState([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSchools() {
      try {
        const { data, error } = await supabase.from('schools').select('*').order('name');
        if (error) throw error;
        
        setSchools(data || []);
        
        // Auto-selection logic
        if (data && data.length > 0) {
          if (data.length === 1) {
            setSelectedSchoolId(data[0].id);
          } else {
            const savedSchoolId = localStorage.getItem('sosa_preferred_school_id');
            if (savedSchoolId && data.find(s => s.id === savedSchoolId)) {
              setSelectedSchoolId(savedSchoolId);
            } else {
              setSelectedSchoolId(data[0].id); // default to first if none saved
            }
          }
        }
      } catch (err) {
        console.error('Error fetching schools:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchSchools();
  }, []);

  // Update localStorage when selection changes
  useEffect(() => {
    if (selectedSchoolId) {
      localStorage.setItem('sosa_preferred_school_id', selectedSchoolId);
    }
  }, [selectedSchoolId]);

  return (
    <SchoolContext.Provider value={{ schools, selectedSchoolId, setSelectedSchoolId, loading }}>
      {children}
    </SchoolContext.Provider>
  );
}

export function useSchool() {
  return useContext(SchoolContext);
}
