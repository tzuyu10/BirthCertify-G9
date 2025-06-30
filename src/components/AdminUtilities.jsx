import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../../supabase";
import '../styles/AdminUtilities.css';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const AdminUtilities = ({ allRequestsData, users, onRefresh }) => {
  const [activeUtility, setActiveUtility] = useState("export");
  const [loading, setLoading] = useState(false);
  const [tableData, setTableData] = useState({});
  const [filters, setFilters] = useState({
    table: 'requester',
    dateRange: { start: '', end: '' },
    status: '',
    search: '',
    role: '',
    sortBy: 'req_date',
    sortOrder: 'desc'
  });
  const [exportOptions, setExportOptions] = useState({
    format: 'csv',
    includeStatusHistory: true,
    includeUserDetails: true,
    dateRange: { start: '', end: '' }
  });

  // Fetch data for table viewers with proper joins
  const fetchTableData = useCallback(async (tableName) => {
    setLoading(true);
    try {
      let query;
      
      if (tableName === 'requester') {
        query = supabase
          .from('requester')
          .select(`
            *,
            user:user_id (
              user_id,
              fname,
              lname,
              email,
              contact,
              role
            ),
            owner (
              owner_id,
              owner_fname,
              owner_mname,
              owner_lname,
              owner_sex,
              owner_dob,
              owner_nationality,
              place_of_birth,
              address:address_id (
                owner_house_no,
                owner_street,
                owner_city,
                owner_country,
                owner_barangay,
                owner_province
              ),
              parent:parent_id (
                owner_f_fname,
                owner_f_mname,
                owner_f_lname,
                owner_m_fname,
                owner_m_mname,
                owner_m_lname
              )
            ),
            birthcertificate:birthcertificate!req_id (
              bc_number,
              bc_issue_date
            ),
            status:status!req_id (
              status_current,
              status_update_date
            )
          `);
        
        // Apply filters
        if (filters.dateRange.start) {
          query = query.gte('req_date', filters.dateRange.start);
        }
        if (filters.dateRange.end) {
          query = query.lte('req_date', filters.dateRange.end);
        }
        if (filters.search) {
          query = query.or(`req_id.eq.${filters.search},req_fname.ilike.%${filters.search}%,req_lname.ilike.%${filters.search}%,req_purpose.ilike.%${filters.search}%`);
        }
        
      } else if (tableName === 'user') {
        query = supabase.from('user').select('*');
        
        if (filters.role) {
          query = query.eq('role', filters.role);
        }
        if (filters.search) {
          query = query.or(`email.ilike.%${filters.search}%,fname.ilike.%${filters.search}%,lname.ilike.%${filters.search}%`);
        }
        
      } else if (tableName === 'status') {
        query = supabase
          .from('status')
          .select(`
            *,
            requester:req_id (
              req_fname,
              req_lname,
              req_purpose
            )
          `);
        
        if (filters.dateRange.start) {
          query = query.gte('status_update_date', filters.dateRange.start);
        }
        if (filters.dateRange.end) {
          query = query.lte('status_update_date', filters.dateRange.end);
        }
        if (filters.status) {
          query = query.eq('status_current', filters.status);
        }
        if (filters.search) {
          query = query.or(`req_id.eq.${filters.search},status_current.ilike.%${filters.search}%`);
        }
        
      } else if (tableName === 'owner') {
        query = supabase
          .from('owner')
          .select(`
            *,
            address:address_id (
              owner_house_no,
              owner_street,
              owner_city,
              owner_country,
              owner_barangay,
              owner_province
            ),
            parent:parent_id (
              owner_f_fname,
              owner_f_mname,
              owner_f_lname,
              owner_m_fname,
              owner_m_mname,
              owner_m_lname
            )
          `);
          
        if (filters.search) {
          query = query.or(`owner_fname.ilike.%${filters.search}%,owner_lname.ilike.%${filters.search}%,owner_nationality.ilike.%${filters.search}%`);
        }
        
      } else if (tableName === 'address') {
        query = supabase.from('address').select('*');
        
        if (filters.search) {
          query = query.or(`owner_street.ilike.%${filters.search}%,owner_city.ilike.%${filters.search}%,owner_barangay.ilike.%${filters.search}%,owner_province.ilike.%${filters.search}%`);
        }
        
      } else if (tableName === 'birthcertificate') {
        query = supabase
          .from('birthcertificate')
          .select(`
            *,
            requester:req_id (
              req_fname,
              req_lname,
              req_purpose
            )
          `);
      }

      // Apply sorting
      const validSortColumns = {
        requester: ['req_id', 'req_date', 'req_fname', 'req_lname'],
        user: ['user_id', 'fname', 'lname', 'email', 'creationdate'],
        status: ['status_id', 'req_id', 'status_update_date'],
        owner: ['owner_id', 'owner_fname', 'owner_lname', 'owner_dob'],
        address: ['address_id', 'owner_city', 'owner_province'],
        birthcertificate: ['bc_number', 'bc_issue_date']
      };
      
      const sortColumn = validSortColumns[tableName]?.includes(filters.sortBy) 
        ? filters.sortBy 
        : validSortColumns[tableName]?.[0] || 'id';
        
      query = query.order(sortColumn, { ascending: filters.sortOrder === 'asc' });

      const { data, error } = await query;
      if (error) throw error;

      setTableData(prev => ({ ...prev, [tableName]: data || [] }));
    } catch (error) {
      console.error(`Error fetching ${tableName} data:`, error);
      alert(`Error fetching ${tableName} data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Enhanced data preparation for export with proper schema alignment
  const prepareExportData = useCallback(async () => {
    let exportData = [];
    
    try {
      let query = supabase
        .from('requester')
        .select(`
          *,
          user:user_id (
            user_id,
            fname,
            lname,
            email,
            contact,
            role
          ),
          owner (
            owner_id,
            owner_fname,
            owner_mname,
            owner_lname,
            owner_sex,
            owner_dob,
            owner_nationality,
            place_of_birth,
            address:address_id (
              owner_house_no,
              owner_street,
              owner_city,
              owner_country,
              owner_barangay,
              owner_province
            ),
            parent:parent_id (
              owner_f_fname,
              owner_f_mname,
              owner_f_lname,
              owner_m_fname,
              owner_m_mname,
              owner_m_lname
            )
          ),
          birthcertificate:birthcertificate!req_id (
            bc_number,
            bc_issue_date
          )
        `);
  
      // If status history is requested, get all status records, otherwise just get current
      if (exportOptions.includeStatusHistory) {
        query = query.select(`
          *,
          user:user_id (
            user_id,
            fname,
            lname,
            email,
            contact,
            role
          ),
          owner (
            owner_id,
            owner_fname,
            owner_mname,
            owner_lname,
            owner_sex,
            owner_dob,
            owner_nationality,
            place_of_birth,
            address:address_id (
              owner_house_no,
              owner_street,
              owner_city,
              owner_country,
              owner_barangay,
              owner_province
            ),
            parent:parent_id (
              owner_f_fname,
              owner_f_mname,
              owner_f_lname,
              owner_m_fname,
              owner_m_mname,
              owner_m_lname
            )
          ),
          birthcertificate:birthcertificate!req_id (
            bc_number,
            bc_issue_date
          ),
          status:status!req_id (
            status_current,
            status_update_date
          )
        `);
      } else {
        // Get only the latest status
        query = query.select(`
          *,
          user:user_id (
            user_id,
            fname,
            lname,
            email,
            contact,
            role
          ),
          owner (
            owner_id,
            owner_fname,
            owner_mname,
            owner_lname,
            owner_sex,
            owner_dob,
            owner_nationality,
            place_of_birth,
            address:address_id (
              owner_house_no,
              owner_street,
              owner_city,
              owner_country,
              owner_barangay,
              owner_province
            ),
            parent:parent_id (
              owner_f_fname,
              owner_f_mname,
              owner_f_lname,
              owner_m_fname,
              owner_m_mname,
              owner_m_lname
            )
          ),
          birthcertificate:birthcertificate!req_id (
            bc_number,
            bc_issue_date
          ),
          status:status!req_id (
            status_current,
            status_update_date
          )
        `);
      }
  
      const { data: requestsWithJoins, error } = await query;
  
      if (error) throw error;
      exportData = requestsWithJoins || [];
  
      // Apply date range filter
      if (exportOptions.dateRange.start) {
        exportData = exportData.filter(req => 
          new Date(req.req_date) >= new Date(exportOptions.dateRange.start)
        );
      }
      if (exportOptions.dateRange.end) {
        exportData = exportData.filter(req => 
          new Date(req.req_date) <= new Date(exportOptions.dateRange.end)
        );
      }
  
      // Enhance data with status timeline if requested
      if (exportOptions.includeStatusHistory) {
        exportData = exportData.map((request) => {
          const statusArray = Array.isArray(request.status) ? request.status : 
                             (request.status ? [request.status] : []);
          
          const statusTimeline = statusArray
            .sort((a, b) => new Date(a.status_update_date) - new Date(b.status_update_date))
            .map(s => `${s.status_current} (${new Date(s.status_update_date).toLocaleDateString()})`)
            .join(' → ');
          
          return {
            ...request,
            status_timeline: statusTimeline
          };
        });
      }
  
      return exportData;
    } catch (error) {
      console.error('Error preparing export data:', error);
      return [];
    }
  }, [exportOptions]);

  // Utility function to safely access nested data
  const safeGet = (obj, path, defaultValue = 'N/A') => {
    if (!obj || !path) return defaultValue;
    
    try {
      return path.split('.').reduce((current, key) => {
        if (current === null || current === undefined) return undefined;
        
        // Handle array access
        if (key.includes('[') && key.includes(']')) {
          const [arrayKey, indexStr] = key.split('[');
          const index = parseInt(indexStr.replace(']', ''));
          const arrayData = current[arrayKey];
          return Array.isArray(arrayData) ? arrayData[index] : arrayData;
        }
        
        return current[key];
      }, obj) ?? defaultValue;
    } catch (error) {
      return defaultValue;
    }
  };

  // Utility function to safely truncate strings
  const safeTruncate = (str, maxLength = 25) => {
    if (!str || typeof str !== 'string') return '';
    return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
  };

  // Utility function to escape CSV fields
  const escapeCSVField = (field) => {
    if (field === null || field === undefined) return '';
    const str = String(field);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // Utility function to convert array to CSV string
  const arrayToCSV = (data) => {
    if (!data.length) return '';
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.map(escapeCSVField).join(','),
      ...data.map(row => 
        headers.map(header => escapeCSVField(row[header])).join(',')
      )
    ].join('\n');
    
    return csvContent;
  };

  // Fixed CSV Export with proper data access
  const exportToCSV = useCallback(async () => {
    setLoading(true);
    try {
      const data = await prepareExportData();
      
      const csvData = data.map(request => {
        // Handle status data properly
        const statusData = Array.isArray(request.status) ? request.status[0] : request.status;
        const currentStatus = statusData ? statusData.status_current : 'N/A';
        const statusDate = statusData ? new Date(statusData.status_update_date).toLocaleDateString() : 'N/A';
        
        // Handle birth certificate data
        const bcData = Array.isArray(request.birthcertificate) ? request.birthcertificate[0] : request.birthcertificate;
        
        // Base export data
        const baseData = {
          'Request ID': request.req_id || 'N/A',
          'Date Requested': request.req_date ? new Date(request.req_date).toLocaleDateString() : 'N/A',
          'Requester First Name': request.req_fname || 'N/A',
          'Requester Last Name': request.req_lname || 'N/A',
          'Requester Contact': request.req_contact || 'N/A',
          'Purpose': request.req_purpose || 'N/A',
          'Is Draft': request.is_draft ? 'Yes' : 'No',
          'Current Status': currentStatus,
          'Status Update Date': statusDate,
          'Owner First Name': request.owner ? request.owner.owner_fname : 'N/A',
          'Owner Middle Name': request.owner ? request.owner.owner_mname : 'N/A',
          'Owner Last Name': request.owner ? request.owner.owner_lname : 'N/A',
          'Owner Sex': request.owner ? request.owner.owner_sex : 'N/A',
          'Owner Date of Birth': request.owner && request.owner.owner_dob 
            ? new Date(request.owner.owner_dob).toLocaleDateString() 
            : 'N/A',
          'Owner Nationality': request.owner ? request.owner.owner_nationality : 'N/A',
          'Place of Birth': request.owner ? request.owner.place_of_birth : 'N/A',
          'Birth Certificate Number': bcData ? bcData.bc_number : 'N/A',
          'Birth Certificate Issue Date': bcData && bcData.bc_issue_date
            ? new Date(bcData.bc_issue_date).toLocaleDateString() 
            : 'N/A'
        };
  
        // Add user details if option is enabled
        if (exportOptions.includeUserDetails) {
          baseData['User Email'] = request.user ? request.user.email : 'N/A';
          baseData['User Full Name'] = request.user ? `${request.user.fname || ''} ${request.user.lname || ''}`.trim() : 'N/A';
          baseData['User Role'] = request.user ? request.user.role : 'N/A';
          baseData['User Contact'] = request.user ? request.user.contact : 'N/A';
        }
  
        // Add address details if user details are enabled
        if (exportOptions.includeUserDetails) {
          baseData['Address House No'] = request.owner && request.owner.address ? request.owner.address.owner_house_no : 'N/A';
          baseData['Address Street'] = request.owner && request.owner.address ? request.owner.address.owner_street : 'N/A';
          baseData['Address Barangay'] = request.owner && request.owner.address ? request.owner.address.owner_barangay : 'N/A';
          baseData['Address City'] = request.owner && request.owner.address ? request.owner.address.owner_city : 'N/A';
          baseData['Address Province'] = request.owner && request.owner.address ? request.owner.address.owner_province : 'N/A';
          baseData['Address Country'] = request.owner && request.owner.address ? request.owner.address.owner_country : 'N/A';
          baseData['Father First Name'] = request.owner && request.owner.parent ? request.owner.parent.owner_f_fname : 'N/A';
          baseData['Father Middle Name'] = request.owner && request.owner.parent ? request.owner.parent.owner_f_mname : 'N/A';
          baseData['Father Last Name'] = request.owner && request.owner.parent ? request.owner.parent.owner_f_lname : 'N/A';
          baseData['Mother First Name'] = request.owner && request.owner.parent ? request.owner.parent.owner_m_fname : 'N/A';
          baseData['Mother Middle Name'] = request.owner && request.owner.parent ? request.owner.parent.owner_m_mname : 'N/A';
          baseData['Mother Last Name'] = request.owner && request.owner.parent ? request.owner.parent.owner_m_lname : 'N/A';
        }
  
        // Add status history if option is enabled
        if (exportOptions.includeStatusHistory) {
          baseData['Status Timeline'] = request.status_timeline || 'N/A';
          
          // If we have multiple status records, add them
          if (Array.isArray(request.status) && request.status.length > 1) {
            request.status.forEach((status, index) => {
              baseData[`Status ${index + 1}`] = status.status_current || 'N/A';
              baseData[`Status ${index + 1} Date`] = status.status_update_date 
                ? new Date(status.status_update_date).toLocaleDateString() 
                : 'N/A';
            });
          }
        }
  
        return baseData;
      });
  
      const csvString = arrayToCSV(csvData);
      
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `requests_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      alert('Error exporting to CSV. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [prepareExportData, exportOptions]);

  // JSON Export with proper schema structure
  const exportToJSON = useCallback(async () => {
    setLoading(true);
    try {
      const data = await prepareExportData();
      
      const exportData = {
        metadata: {
          exportDate: new Date().toISOString(),
          totalRecords: data.length,
          filters: exportOptions,
          summary: {
            pending: data.filter(r => {
              const status = Array.isArray(r.status) ? r.status[0] : r.status;
              return status && status.status_current === 'pending';
            }).length,
            approved: data.filter(r => {
              const status = Array.isArray(r.status) ? r.status[0] : r.status;
              return status && ['approved', 'completed'].includes(status.status_current);
            }).length,
            rejected: data.filter(r => {
              const status = Array.isArray(r.status) ? r.status[0] : r.status;
              return status && ['rejected', 'cancelled'].includes(status.status_current);
            }).length,
            draft: data.filter(r => r.is_draft).length
          }
        },
        requests: data.map(request => ({
          req_id: request.req_id,
          req_date: request.req_date,
          requester: {
            req_fname: request.req_fname,
            req_lname: request.req_lname,
            req_contact: request.req_contact,
            req_purpose: request.req_purpose,
            is_draft: request.is_draft
          },
          user: request.user || null,
          owner: request.owner || null,
          birth_certificate: Array.isArray(request.birthcertificate) ? request.birthcertificate[0] : request.birthcertificate,
          current_status: Array.isArray(request.status) ? request.status[0] : request.status,
          ...(exportOptions.includeStatusHistory && { status_history: request.status }),
          status_timeline: request.status_timeline || ''
        }))
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `requests_detailed_export_${new Date().toISOString().split('T')[0]}.json`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error exporting to JSON:', error);
      alert('Error exporting to JSON. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [prepareExportData, exportOptions]);

  // Enhanced PDF Export with proper schema fields
// Replace the exportToPDF function with this fixed version
const exportToPDF = useCallback(async () => {
    setLoading(true);
    try {
      const data = await prepareExportData();
      const doc = new jsPDF('l', 'pt'); // Use landscape orientation for more columns
      
      // Title
      doc.setFontSize(16);
      doc.text('Birth Certificate Request Management System - Export Report', 40, 40);
      
      // Summary
      doc.setFontSize(12);
      doc.text(`Export Date: ${new Date().toLocaleString()}`, 40, 65);
      doc.text(`Total Records: ${data.length}`, 40, 80);
      
      // Options summary
      const optionsText = [
        exportOptions.includeUserDetails ? 'User Details: Included' : 'User Details: Excluded',
        exportOptions.includeStatusHistory ? 'Status History: Included' : 'Status History: Excluded'
      ].join(' | ');
      doc.text(`Export Options: ${optionsText}`, 40, 95);
      
      // Status summary
      const pending = data.filter(r => {
        const status = Array.isArray(r.status) ? r.status[0] : r.status;
        return status && status.status_current === 'pending';
      }).length;
      const approved = data.filter(r => {
        const status = Array.isArray(r.status) ? r.status[0] : r.status;
        return status && ['approved', 'completed'].includes(status.status_current);
      }).length;
      const rejected = data.filter(r => {
        const status = Array.isArray(r.status) ? r.status[0] : r.status;
        return status && ['rejected', 'cancelled'].includes(status.status_current);
      }).length;
      const draft = data.filter(r => r.is_draft).length;
      
      doc.text(`Status Summary - Pending: ${pending} | Approved: ${approved} | Rejected: ${rejected} | Draft: ${draft}`, 40, 110);
      
      // Define base columns (always included)
      let headers = ['Req ID', 'Date', 'Requester Name', 'Purpose', 'Status', 'Draft'];
      
      // Add user details columns if enabled
      if (exportOptions.includeUserDetails) {
        headers.push('User Email', 'User Role', 'Owner Full Name', 'Owner DOB', 'Address', 'Contact');
      }
      
      // Add status history column if enabled
      if (exportOptions.includeStatusHistory) {
        headers.push('Status Timeline');
      }
      
      // Prepare table data based on options
      const tableData = data.map(request => {
        const statusData = Array.isArray(request.status) ? request.status[0] : request.status;
        
        // Base row data (always included)
        let row = [
          request.req_id || '',
          request.req_date ? new Date(request.req_date).toLocaleDateString() : '',
          safeTruncate(`${request.req_fname || ''} ${request.req_lname || ''}`.trim(), 20),
          safeTruncate(request.req_purpose || '', 25),
          statusData ? statusData.status_current : 'N/A',
          request.is_draft ? 'Yes' : 'No'
        ];
        
        // Add user details if enabled
        if (exportOptions.includeUserDetails) {
          const ownerFullName = request.owner 
            ? `${request.owner.owner_fname || ''} ${request.owner.owner_mname || ''} ${request.owner.owner_lname || ''}`.trim()
            : 'N/A';
          
          const address = request.owner && request.owner.address
            ? `${request.owner.address.owner_street || ''}, ${request.owner.address.owner_city || ''}`.trim()
            : 'N/A';
          
          row.push(
            request.user ? request.user.email : 'N/A',
            request.user ? request.user.role : 'N/A',
            safeTruncate(ownerFullName, 25),
            request.owner && request.owner.owner_dob 
              ? new Date(request.owner.owner_dob).toLocaleDateString()
              : 'N/A',
            safeTruncate(address, 30),
            request.req_contact || request.user?.contact || 'N/A'
          );
        }
        
        // Add status history if enabled
        if (exportOptions.includeStatusHistory) {
          row.push(safeTruncate(request.status_timeline || 'N/A', 40));
        }
        
        return row;
      });
  
      // Use autoTable if available
      if (typeof doc.autoTable === 'function') {
        doc.autoTable({
          head: [headers],
          body: tableData,
          startY: 125,
          styles: { 
            fontSize: exportOptions.includeUserDetails ? 7 : 8, // Smaller font if more columns
            cellPadding: 3
          },
          headStyles: { 
            fillColor: [41, 128, 185],
            fontSize: exportOptions.includeUserDetails ? 7 : 8
          },
          alternateRowStyles: { fillColor: [245, 245, 245] },
          columnStyles: {
            // Adjust column widths based on content
            0: { cellWidth: 40 }, // Req ID
            1: { cellWidth: 60 }, // Date
            2: { cellWidth: exportOptions.includeUserDetails ? 80 : 100 }, // Requester
            3: { cellWidth: exportOptions.includeUserDetails ? 100 : 120 }, // Purpose
            4: { cellWidth: 50 }, // Status
            5: { cellWidth: 30 }, // Draft
          },
          margin: { left: 40, right: 40 },
          tableWidth: 'auto'
        });
      } else {
        // Fallback: Create simple table manually
        doc.setFontSize(8);
        let yPosition = 130;
        const columnWidths = exportOptions.includeUserDetails 
          ? [40, 60, 80, 100, 50, 30, 80, 50, 80, 60, 100, 60] // With user details
          : [60, 80, 120, 150, 80, 40]; // Basic columns
        
        let xPosition = 40;
        
        // Headers
        headers.forEach((header, index) => {
          doc.text(String(header), xPosition, yPosition);
          xPosition += columnWidths[index] || 80;
        });
        
        yPosition += 15;
        
        // Data rows
        tableData.forEach((row, rowIndex) => {
          if (yPosition > 500) { // Check if we need a new page
            doc.addPage();
            yPosition = 40;
          }
          
          xPosition = 40;
          row.forEach((cell, cellIndex) => {
            doc.text(String(cell), xPosition, yPosition);
            xPosition += columnWidths[cellIndex] || 80;
          });
          
          yPosition += 12;
        });
      }
  
      // Add footer with export options
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Page ${i} of ${pageCount}`, 40, doc.internal.pageSize.height - 20);
        doc.text(`Options: ${optionsText}`, doc.internal.pageSize.width - 300, doc.internal.pageSize.height - 20);
      }
  
      const fileName = `birth_cert_requests_report_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      alert('Error exporting to PDF. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [prepareExportData, safeTruncate, exportOptions]);

  // Handle export based on format
  const handleExport = useCallback(() => {
    switch (exportOptions.format) {
      case 'csv':
        exportToCSV();
        break;
      case 'json':
        exportToJSON();
        break;
      case 'pdf':
        exportToPDF();
        break;
      default:
        exportToCSV();
    }
  }, [exportOptions.format, exportToCSV, exportToJSON, exportToPDF]);

  // Render table viewer with proper column handling
  const renderTableViewer = useCallback(() => {
    const currentData = tableData[filters.table] || [];
    
    if (!currentData.length) {
      return (
        <div style={{ padding: '20px', textAlign: 'center', color: '#333' }}>
        No data found. Click "Load Data" to fetch records.
        </div>
      );
    }

    // Get columns but exclude complex nested objects for display
    const firstRow = currentData[0] || {};
    const columns = Object.keys(firstRow).filter(col => {
      const value = firstRow[col];
      return value === null || value === undefined || 
             typeof value === 'string' || 
             typeof value === 'number' || 
             typeof value === 'boolean' ||
             value instanceof Date;
    });
    
    return (
      <div>
        <div style={{ overflowX: 'auto', maxHeight: '500px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', color: '#333' }}>
            <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f5f5f5' }}>
              <tr>
                {columns.map(col => (
                  <th key={col} style={{ 
                    border: '1px solid #ddd', 
                    padding: '8px', 
                    textAlign: 'left',
                    cursor: 'pointer',
                    minWidth: '100px'
                  }}
                  onClick={() => setFilters(prev => ({
                    ...prev,
                    sortBy: col,
                    sortOrder: prev.sortBy === col && prev.sortOrder === 'asc' ? 'desc' : 'asc'
                  }))}>
                    {col.replace(/_/g, ' ').toUpperCase()} {filters.sortBy === col && (filters.sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentData.map((row, index) => (
                <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white' }}>
                  {columns.map(col => {
                    let value = row[col];
                    
                    // Format dates
                    if (value && (col.includes('date') || col.includes('Date'))) {
                      try {
                        value = new Date(value).toLocaleDateString();
                      } catch (e) {
                        // Keep original value if date parsing fails
                      }
                    }
                    
                    // Handle boolean values
                    if (typeof value === 'boolean') {
                      value = value ? 'Yes' : 'No';
                    }
                    
                    return (
                      <td key={col} style={{ 
                        border: '1px solid #ddd', 
                        padding: '6px',
                        maxWidth: '200px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        color: '#000'
                      }}>
                        {String(value || '')}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: '10px', fontSize: '14px', color: '#333' }}>
        Showing {currentData.length} records from {filters.table} table
        </div>
      </div>
    );
  }, [tableData, filters]);

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ color: '#333' }}>Admin Utilities</h2>
      
      {/* Utility Navigation */}
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={() => setActiveUtility("export")}
          style={{
            padding: '10px 20px',
            marginRight: '10px',
            backgroundColor: activeUtility === "export" ? '#007bff' : '#f8f9fa',
            color: activeUtility === "export" ? 'white' : 'black',
            border: '1px solid #ddd',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Bulk Export
        </button>
        <button 
          onClick={() => setActiveUtility("tables")}
          style={{
            padding: '10px 20px',
            backgroundColor: activeUtility === "tables" ? '#007bff' : '#f8f9fa',
            color: activeUtility === "tables" ? 'white' : 'black',
            border: '1px solid #ddd',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Database Viewer
        </button>
      </div>

      {/* Bulk Export Utility */}
      {activeUtility === "export" && (
        <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '5px' }}>
          <h3 style={{ color: '#333' }}>Bulk Data Export</h3>
          
          {/* Export Format Selection */}
          <div style={{ marginBottom: '15px' }}>
           <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' }}>
             Export Format:
           </label>
           <select 
             value={exportOptions.format}
             onChange={(e) => setExportOptions(prev => ({ ...prev, format: e.target.value }))}
             style={{ 
               padding: '8px', 
               border: '1px solid #ddd', 
               borderRadius: '4px',
               marginRight: '10px',
               color: '#333'
             }}
           >
             <option value="csv">CSV (Spreadsheet)</option>
             <option value="json">JSON (Structured Data)</option>
             <option value="pdf">PDF (Report)</option>
           </select>
         </div>

         {/* Date Range Filter */}
         <div style={{ marginBottom: '15px' }}>
           <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' }}>
             Date Range (Optional):
           </label>
           <input
             type="date"
             value={exportOptions.dateRange.start}
             onChange={(e) => setExportOptions(prev => ({
               ...prev,
               dateRange: { ...prev.dateRange, start: e.target.value }
             }))}
             style={{ 
               padding: '8px', 
               border: '1px solid #ddd', 
               borderRadius: '4px', 
               marginRight: '10px',
               color: '#333'
             }}
             placeholder="Start Date"
           />
           <input
             type="date"
             value={exportOptions.dateRange.end}
             onChange={(e) => setExportOptions(prev => ({
               ...prev,
               dateRange: { ...prev.dateRange, end: e.target.value }
             }))}
             style={{ 
               padding: '8px', 
               border: '1px solid #ddd', 
               borderRadius: '4px',
               color: '#333'
             }}
             placeholder="End Date"
           />
         </div>

         {/* Export Options */}
         <div style={{ marginBottom: '15px' }}>
           <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' }}>
             Include Additional Data:
           </label>
           <div>
             <label style={{ marginRight: '20px', color: '#333' }}>
               <input
                 type="checkbox"
                 checked={exportOptions.includeStatusHistory}
                 onChange={(e) => setExportOptions(prev => ({
                   ...prev,
                   includeStatusHistory: e.target.checked
                 }))}
                 style={{ marginRight: '5px' }}
               />
               Status History
             </label>
             <label style={{ color: '#333' }}>
               <input
                 type="checkbox"
                 checked={exportOptions.includeUserDetails}
                 onChange={(e) => setExportOptions(prev => ({
                   ...prev,
                   includeUserDetails: e.target.checked
                 }))}
                 style={{ marginRight: '5px' }}
               />
               User Details
             </label>
           </div>
         </div>

         {/* Export Button */}
         <button
           onClick={handleExport}
           disabled={loading}
           style={{
             padding: '12px 24px',
             backgroundColor: loading ? '#6c757d' : '#28a745',
             color: 'white',
             border: 'none',
             borderRadius: '5px',
             cursor: loading ? 'not-allowed' : 'pointer',
             fontSize: '14px',
             fontWeight: 'bold'
           }}
         >
           {loading ? 'Exporting...' : `Export as ${exportOptions.format.toUpperCase()}`}
         </button>
       </div>
     )}

     {/* Database Table Viewer */}
     {activeUtility === "tables" && (
       <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '5px' }}>
         <h3 style={{ color: '#333' }}>Database Table Viewer</h3>
         
         {/* Table Selection */}
         <div style={{ marginBottom: '15px' }}>
           <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' }}>
             Select Table:
           </label>
           <select 
             value={filters.table}
             onChange={(e) => setFilters(prev => ({ ...prev, table: e.target.value }))}
             style={{ 
               padding: '8px', 
               border: '1px solid #ddd', 
               borderRadius: '4px',
               marginRight: '10px',
               color: '#333'
             }}
           >
             <option value="requester">Requester</option>
             <option value="user">User</option>
             <option value="owner">Owner</option>
             <option value="status">Status</option>
             <option value="address">Address</option>
             <option value="birthcertificate">Birth Certificate</option>
           </select>
           <button
             onClick={() => fetchTableData(filters.table)}
             disabled={loading}
             style={{
               padding: '8px 16px',
               backgroundColor: loading ? '#6c757d' : '#007bff',
               color: 'white',
               border: 'none',
               borderRadius: '4px',
               cursor: loading ? 'not-allowed' : 'pointer'
             }}
           >
             {loading ? 'Loading...' : 'Load Data'}
           </button>
         </div>

         {/* Filters */}
         <div style={{ marginBottom: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
           {/* Search Filter */}
           <input
             type="text"
             placeholder="Search..."
             value={filters.search}
             onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
             style={{ 
               padding: '8px', 
               border: '1px solid #ddd', 
               borderRadius: '4px',
               minWidth: '200px',
               color: '#333'
             }}
           />

           {/* Date Range Filters */}
           {(filters.table === 'requester' || filters.table === 'status') && (
             <>
               <input
                 type="date"
                 placeholder="Start Date"
                 value={filters.dateRange.start}
                 onChange={(e) => setFilters(prev => ({
                   ...prev,
                   dateRange: { ...prev.dateRange, start: e.target.value }
                 }))}
                 style={{ 
                   padding: '8px', 
                   border: '1px solid #ddd', 
                   borderRadius: '4px',
                   color: '#333'
                 }}
               />
               <input
                 type="date"
                 placeholder="End Date"
                 value={filters.dateRange.end}
                 onChange={(e) => setFilters(prev => ({
                   ...prev,
                   dateRange: { ...prev.dateRange, end: e.target.value }
                 }))}
                 style={{ 
                   padding: '8px', 
                   border: '1px solid #ddd', 
                   borderRadius: '4px',
                   color: '#333'
                 }}
               />
             </>
           )}

           {/* Status Filter */}
           {filters.table === 'status' && (
             <select
               value={filters.status}
               onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
               style={{ 
                 padding: '8px', 
                 border: '1px solid #ddd', 
                 borderRadius: '4px',
                 color: '#333'
               }}
             >
               <option value="">All Statuses</option>
               <option value="pending">Pending</option>
               <option value="approved">Approved</option>
               <option value="rejected">Rejected</option>
               <option value="completed">Completed</option>
               <option value="cancelled">Cancelled</option>
             </select>
           )}

           {/* Role Filter */}
           {filters.table === 'user' && (
             <select
               value={filters.role}
               onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
               style={{ 
                 padding: '8px', 
                 border: '1px solid #ddd', 
                 borderRadius: '4px',
                 color: '#333'
               }}
             >
               <option value="">All Roles</option>
               <option value="admin">Admin</option>
               <option value="user">User</option>
               <option value="staff">Staff</option>
             </select>
           )}

           {/* Apply Filters Button */}
           <button
             onClick={() => fetchTableData(filters.table)}
             style={{
               padding: '8px 16px',
               backgroundColor: '#28a745',
               color: 'white',
               border: 'none',
               borderRadius: '4px',
               cursor: 'pointer'
             }}
           >
             Apply Filters
           </button>

           {/* Clear Filters Button */}
           <button
             onClick={() => setFilters(prev => ({
               ...prev,
               dateRange: { start: '', end: '' },
               status: '',
               search: '',
               role: ''
             }))}
             style={{
               padding: '8px 16px',
               backgroundColor: '#6c757d',
               color: 'white',
               border: 'none',
               borderRadius: '4px',
               cursor: 'pointer'
             }}
           >
             Clear Filters
           </button>
         </div>

         {/* Table Data Display */}
         {renderTableViewer()}
       </div>
     )}
   </div>
 );
};

export default AdminUtilities;