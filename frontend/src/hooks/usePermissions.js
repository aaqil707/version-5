import { useState, useEffect } from 'react';

export const usePermissions = () => {
  const [permissions, setPermissions] = useState({
    isAdmin: false,
    canEdit: false,
    canView: true,
    canAccessEmailSettings: false,
    canAccessUserManagement: false,
  });

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = user.admin_access === true || user.admin_access === 1;
    
    setPermissions({
      isAdmin,
      canEdit: isAdmin,
      canView: true,
      canAccessEmailSettings: isAdmin,
      canAccessUserManagement: isAdmin,
    });
  }, []);

  return permissions;
};

export default usePermissions;