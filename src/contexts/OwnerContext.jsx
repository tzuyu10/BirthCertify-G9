// OwnerContext.jsx
import React, { createContext, useContext, useState } from 'react';
import { supabase } from '../../supabase';

const OwnerContext = createContext();

export const useOwner = () => useContext(OwnerContext);

export const OwnerProvider = ({ children }) => {
  const [formData, setFormData] = useState({
    // Owner
    owner_fname: '',
    owner_mname: '',
    owner_lname: '',
    owner_suffix: '',
    owner_sex: '',
    owner_dob: '',
    owner_nationality: 'Filipino',
    place_of_birth: '',

    // Address
    house_no: '',
    street: '',
    barangay: '',
    city: '',
    province: '',
    country: 'Philippines',

    // Father's Info
    f_fname: '',
    f_mname: '',
    f_lname: '',

    // Mother's Info
    m_fname: '',
    m_mname: '',
    m_lname: ''
  });

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const findOrCreate = async (table, matchFields, insertFields) => {
    const { data: existing, error: findError } = await supabase
      .from(table)
      .select('*')
      .match(matchFields)
      .maybeSingle();

    if (findError) throw findError;
    if (existing) return existing;

    const { data: inserted, error: insertError } = await supabase
      .from(table)
      .insert(insertFields)
      .select()
      .single();

    if (insertError) throw insertError;
    return inserted;
  };

  const handleOwnerSubmission = async () => {
    try {
      const parent = await findOrCreate(
        'parent',
        {
          owner_f_fname: formData.f_fname,
          owner_f_lname: formData.f_lname,
          owner_m_fname: formData.m_fname,
          owner_m_lname: formData.m_lname,
        },
        {
          owner_f_fname: formData.f_fname,
          owner_f_mname: formData.f_mname,
          owner_f_lname: formData.f_lname,
          owner_m_fname: formData.m_fname,
          owner_m_mname: formData.m_mname,
          owner_m_lname: formData.m_lname,
        }
      );

      const address = await findOrCreate(
        'address',
        {
          owner_house_no: formData.house_no,
          owner_street: formData.street,
          owner_barangay: formData.barangay,
          owner_city: formData.city,
          owner_province: formData.province,
          owner_country: formData.country,
        },
        {
          owner_house_no: formData.house_no,
          owner_street: formData.street,
          owner_barangay: formData.barangay,
          owner_city: formData.city,
          owner_province: formData.province,
          owner_country: formData.country,
        }
      );

      const { error: ownerError } = await supabase.from('owner').insert({
        owner_fname: formData.owner_fname,
        owner_mname: formData.owner_mname,
        owner_lname: formData.owner_lname,
        owner_suffix: formData.owner_suffix,
        owner_sex: formData.owner_sex,
        owner_dob: formData.owner_dob,
        owner_nationality: formData.owner_nationality,
        place_of_birth: formData.place_of_birth,
        parent_id: parent.parent_id,
        address_id: address.address_id,
      });

      if (ownerError) throw ownerError;

      console.log('Owner data submitted successfully.');
    } catch (error) {
      console.error('Submission error:', error);
    }
  };

  return (
    <OwnerContext.Provider value={{ formData, handleChange, handleOwnerSubmission }}>
      {children}
    </OwnerContext.Provider>
  );
};
