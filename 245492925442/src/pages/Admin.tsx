import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';

interface UserData {
    id: number;
    username: string;
    email: string;
    role: string;
    is_active: number;
    created_at: string;
}

export default function Admin() {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const [users, setUsers] = useState<UserData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingUser, setEditingUser] = useState<UserData | null>(null);

    // Form State
    const [newUser, setNewUser] = useState({ username: '', email: '', password: '', role: 'user' });
    const [editForm, setEditForm] = useState({ username: '', email: '', password: '', role: 'user' });

    useEffect(() => {
        if (!user || user.role !== 'admin') {
            toast.error('无权访问');
            navigate('/');
            return;
        }
        fetchUsers();
    }, [user]);

    const fetchUsers = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/admin/users', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Fetch failed');
            const data = await res.json();
            setUsers(data);
        } catch (e) {
            toast.error('获取用户列表失败');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('确定删除该用户吗？所有数据将丢失！')) return;
        try {
            const res = await fetch(`http://localhost:5000/api/admin/users/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                toast.success('用户已删除');
                fetchUsers();
            } else {
                toast.error('删除失败');
            }
        } catch (e) {
            toast.error('操作失败');
        }
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:5000/api/admin/users', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}` 
                },
                body: JSON.stringify(newUser)
            });
            if (res.ok) {
                toast.success('用户创建成功');
                setShowAddModal(false);
                setNewUser({ username: '', email: '', password: '', role: 'user' });
                fetchUsers();
            } else {
                let errStr = '创建失败';
                try {
                    const err = await res.json();
                    errStr = err.error || errStr;
                } catch {
                    errStr = await res.text().catch(() => '') || res.statusText || errStr;
                }
                toast.error(errStr);
            }
        } catch (e) {
            toast.error('操作失败');
        }
    };

    const handleEditClick = (u: UserData) => {
        setEditingUser(u);
        setEditForm({ username: u.username, email: u.email, password: '', role: u.role });
        setShowEditModal(true);
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        
        try {
            const res = await fetch(`http://localhost:5000/api/admin/users/${editingUser.id}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}` 
                },
                body: JSON.stringify(editForm)
            });
            if (res.ok) {
                    toast.success('用户更新成功');
                    setShowEditModal(false);
                    setEditingUser(null);
                    fetchUsers();
                } else {
                    let errStr = '更新失败';
                    try {
                        const err = await res.json();
                        errStr = err.error || errStr;
                    } catch {
                        errStr = await res.text() || res.statusText;
                    }
                    toast.error(errStr);
                }
        } catch (e) {
            toast.error('操作失败');
        }
    };

    if (isLoading) return <div className="p-8 text-center">加载中...</div>;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link to="/" className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors" title="返回首页">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">用户管理</h1>
                </div>
                <button 
                    onClick={() => setShowAddModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    添加用户
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">用户名</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">邮箱</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">角色</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">注册时间</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">操作</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {users.map((u) => (
                            <tr key={u.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{u.username}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{u.email}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                                        {u.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{new Date(u.created_at).toLocaleDateString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button 
                                        onClick={() => handleEditClick(u)}
                                        className="text-blue-600 hover:text-blue-900 dark:hover:text-blue-400 mr-4"
                                    >
                                        编辑
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(u.id)} 
                                        disabled={u.username === 'admin'}
                                        className={`transition-colors ${u.username === 'admin' ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 hover:text-red-900 dark:hover:text-red-400'}`}
                                        title={u.username === 'admin' ? "无法删除超级管理员" : "删除用户"}
                                    >
                                        删除
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add User Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                            <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setShowAddModal(false)}></div>
                        </div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <form onSubmit={handleAddUser} className="p-6">
                                <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">添加新用户</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">用户名</label>
                                        <input 
                                            type="text" 
                                            required 
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm p-2 border"
                                            value={newUser.username}
                                            onChange={e => setNewUser({...newUser, username: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">邮箱</label>
                                        <input 
                                            type="email" 
                                            required 
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm p-2 border"
                                            value={newUser.email}
                                            onChange={e => setNewUser({...newUser, email: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">密码</label>
                                        <input 
                                            type="password" 
                                            required 
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm p-2 border"
                                            value={newUser.password}
                                            onChange={e => setNewUser({...newUser, password: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">角色</label>
                                        <select 
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm p-2 border"
                                            value={newUser.role}
                                            onChange={e => setNewUser({...newUser, role: e.target.value})}
                                        >
                                            <option value="user">普通用户</option>
                                            <option value="admin">管理员</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                                    <button
                                        type="submit"
                                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:col-start-2 sm:text-sm"
                                    >
                                        创建
                                    </button>
                                    <button
                                        type="button"
                                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                                        onClick={() => setShowAddModal(false)}
                                    >
                                        取消
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
            {/* Edit User Modal */}
            {showEditModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                            <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setShowEditModal(false)}></div>
                        </div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <form onSubmit={handleEditSubmit} className="p-6">
                                <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">编辑用户</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">用户名</label>
                                        <input 
                                            type="text" 
                                            required 
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm p-2 border"
                                            value={editForm.username}
                                            onChange={e => setEditForm({...editForm, username: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">邮箱</label>
                                        <input 
                                            type="email" 
                                            required 
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm p-2 border"
                                            value={editForm.email}
                                            onChange={e => setEditForm({...editForm, email: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            新密码 <span className="text-gray-400 font-normal">(留空保持不变)</span>
                                        </label>
                                        <input 
                                            type="password" 
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm p-2 border"
                                            value={editForm.password}
                                            onChange={e => setEditForm({...editForm, password: e.target.value})}
                                            placeholder="若不修改密码请留空"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">角色</label>
                                        <select 
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm p-2 border"
                                            value={editForm.role}
                                            onChange={e => setEditForm({...editForm, role: e.target.value})}
                                            disabled={editingUser?.username === 'admin'}
                                        >
                                            <option value="user">普通用户</option>
                                            <option value="admin">管理员</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                                    <button
                                        type="submit"
                                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:col-start-2 sm:text-sm"
                                    >
                                        保存
                                    </button>
                                    <button
                                        type="button"
                                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                                        onClick={() => setShowEditModal(false)}
                                    >
                                        取消
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
