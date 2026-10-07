import React, { createContext, useState, useContext, useEffect } from 'react';
import { login as apiLogin, logout as apiLogout, api } from '../api/authApi';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedToken = sessionStorage.getItem('token');
        const storedUser = sessionStorage.getItem('user');

        if (storedToken && storedUser) {
            setToken(storedToken);
            try {
                const parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);

                // Fetch latest profile in background to keep nicNumber, phoneNumber, address fresh
                if (!storedToken.startsWith('mock-demo')) {
                    api.get('/users/profile').then(res => {
                        if (res?.data) {
                            const enriched = {
                                ...parsedUser,
                                fullName: res.data.fullName || parsedUser.fullName,
                                nicNumber: res.data.nicNumber || res.data.nic || parsedUser.nicNumber,
                                phoneNumber: res.data.phoneNumber || res.data.phone || parsedUser.phoneNumber,
                                address: res.data.address || parsedUser.address,
                                city: res.data.city || parsedUser.city,
                            };
                            setUser(enriched);
                            sessionStorage.setItem('user', JSON.stringify(enriched));
                        }
                    }).catch(() => {});
                }
            } catch (_) {}
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        const data = await apiLogin(email, password);
        setToken(data.token);
        let userData = data.user;
        
        // Fetch full profile if NIC or phone is missing from login payload
        try {
            if (!data.token.startsWith('mock-demo')) {
                const profileRes = await api.get('/users/profile', {
                    headers: { Authorization: `Bearer ${data.token}` }
                });
                if (profileRes?.data) {
                    userData = {
                        ...userData,
                        fullName: profileRes.data.fullName || userData.fullName,
                        nicNumber: profileRes.data.nicNumber || profileRes.data.nic || userData.nicNumber,
                        phoneNumber: profileRes.data.phoneNumber || profileRes.data.phone || userData.phoneNumber,
                        address: profileRes.data.address || userData.address,
                        city: profileRes.data.city || userData.city,
                    };
                }
            }
        } catch (_) {}

        setUser(userData);
        sessionStorage.setItem('token', data.token);
        sessionStorage.setItem('user', JSON.stringify(userData));
        return data;
    };

    const logout = () => {
        apiLogout();
        setToken(null);
        setUser(null);
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, logout, setUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};