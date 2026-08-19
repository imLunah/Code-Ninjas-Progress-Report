import { useEffect } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useParentPortal } from '../../context/ParentPortalContext';

// /parent/students/:id used to be the child's profile. It now selects that
// child and sends the parent to Home, so old bookmarks and any link the staff
// side still produces keep working.
export default function ParentStudentRedirect() {
  const { id } = useParams();
  const { students, setActiveId } = useParentPortal();
  const target = Number(id);
  useEffect(() => {
    if (students && students.some((s) => s.id === target)) setActiveId(target);
  }, [students, target, setActiveId]);
  if (students === null) return null;
  return <Navigate to="/parent/dashboard" replace />;
}
