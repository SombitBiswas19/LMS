import React, { useState, useEffect, useMemo } from 'react';
import {toast} from 'react-hot-toast';
// Removed 'adminAPI' as it's not exported from the api service file.
// You will need to create and export it for full functionality.
import { handleApiError } from '../../services/api'; 
import LoadingSpinner from '../LoadingSpinner';
import { Search, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

// --- MOCK DATA ---
// This is a placeholder. In a real application, this data would come from the adminAPI.
const mockUsers = [
  { id: 1, full_name: 'Sayan Bardhan', email: 'sayan.b@example.com', role: 'admin', created_at: '2025-07-01T10:00:00Z', avatar_url: 'https://placehold.co/100x100/E2E8F0/4A5568?text=SB' },
  { id: 2, full_name: 'Jane Doe', email: 'jane.d@example.com', role: 'student', created_at: '2025-06-15T14:30:00Z', avatar_url: 'https://placehold.co/100x100/E2E8F0/4A5568?text=JD' },
  { id: 3, full_name: 'John Smith', email: 'john.s@example.com', role: 'student', created_at: '2025-05-20T09:00:00Z', avatar_url: null },
];
// --- END MOCK DATA ---


const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'full_name', direction: 'ascending' });

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        // TODO: Replace this with a real API call once `adminAPI` is available.
        // For now, we use mock data.
        // const allUsers = await adminAPI.getAllUsers();
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
        setUsers(mockUsers);
      } catch (err) {
        handleApiError(err);
        setError('Failed to fetch users.');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const filteredAndSortedUsers = useMemo(() => {
    let sortedUsers = [...users];
    if (sortConfig.key) {
      sortedUsers.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortedUsers.filter(user =>
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm, sortConfig]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const handleUpdateUserRole = async (userId, role) => {
    // TODO: Replace with a real API call: await adminAPI.updateUserRole(userId, role);
    setUsers(users.map(u => u.id === userId ? { ...u, role } : u));
    toast.success("User role updated successfully (mock).");
  };

  const handleDeleteUser = async (userId) => {
    // In a real app, you'd use a custom modal instead of window.confirm
    if(window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        // TODO: Replace with a real API call: await adminAPI.deleteUser(userId);
        setUsers(users.filter(u => u.id !== userId));
        toast.success("User deleted successfully (mock).");
    }
  };

  if (loading) return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;
  if (error) return <div className="text-center py-10 text-red-500">{error}</div>;

  const SortableHeader = ({ label, sortKey }) => (
    <th 
        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
        onClick={() => requestSort(sortKey)}
    >
        <div className="flex items-center">
            {label}
            {sortConfig.key === sortKey ? (
                sortConfig.direction === 'ascending' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />
            ) : null}
        </div>
    </th>
  );

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <div className="relative mt-4 md:mt-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search users..."
            className="w-full md:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <SortableHeader label="Name" sortKey="full_name" />
                <SortableHeader label="Email" sortKey="email" />
                <SortableHeader label="Role" sortKey="role" />
                <SortableHeader label="Joined" sortKey="created_at" />
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <img className="h-10 w-10 rounded-full object-cover" src={user.avatar_url || 'https://placehold.co/100x100/E2E8F0/4A5568?text=Avatar'} alt="" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select 
                        value={user.role} 
                        onChange={(e) => handleUpdateUserRole(user.id, e.target.value)}
                        className={`p-1.5 rounded-md text-xs font-medium ${user.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}
                    >
                        <option value="student">Student</option>
                        <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-3">
                        <button onClick={() => handleDeleteUser(user.id)} className="text-red-600 hover:text-red-900 transition-colors">
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
