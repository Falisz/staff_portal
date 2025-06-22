//FRONTEND/App.js
import React, {useCallback, useEffect, useState, useRef} from 'react';
import {BrowserRouter as Router, Routes, Route, Navigate, useNavigate} from 'react-router-dom';
import axios from 'axios';
import Login from './components/Login';
import {InWorks, NotFound, NoAccess, Loading} from "./components/Common";
import StaffView from './components/StaffView';
import ManagerView from './components/ManagerView';
import { ConnectivityProvider } from './ConnectivityContext';
import ConnectivityPopup from './components/ConnectivityPopup';
import PostsIndex from './components/PostsIndex';
import PostsShow from './components/PostsShow';
import './App.css';

console.log(process.env);

const theme = process.env['REACT_APP_THEME'] || 'dark';
const color = process.env['REACT_APP_COLOR'] || 'blue';

const Dashboard = () => <InWorks title={'Dashboard'}/>;
const Schedule = () => <InWorks title={'Schedule'}/>;
const Posts = () => <InWorks title={'Forum'}/>;
const Trainings = () => <InWorks title={'Trainings'}/>;
const Dispositions = () => <InWorks title={'Dispositions Dispositions'}/>;
const ManagerDashboard = () => <InWorks title={'ManagerDashboard'}/>;
const ScheduleShow = () => <InWorks title={'Work schedule'}/>;
const ScheduleEdit = () => <InWorks title={'Work schedule editor'}/>;
const SchedulePast = () => <InWorks title={'Work schedule archive'}/>;
const ScheduleNew = () => <InWorks title={'Work schedule creator'}/>;
const PostsNew = () => <InWorks title={'Create new post'}/>;
const PostsArchive = () => <InWorks title={'Posts archive'}/>;
const EmployeesShow = () => <InWorks title={'Users list'}/>;
const EmployeesNew = () => <InWorks title={'Add new user'}/>;

const componentMap = {
    Dashboard,
    Schedule,
    Posts,
    Trainings,
    Dispositions,
    ManagerDashboard,
    ScheduleShow,
    ScheduleEdit,
    SchedulePast,
    ScheduleNew,
    PostsIndex,
    PostsShow,
    PostsNew,
    PostsArchive,
    EmployeesShow,
    EmployeesNew,
};

const App = () => {
    const isCheckingRef = useRef(false);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [access, setAccess] = useState(null);
    const [pages, setPages] = useState([]);
    const [managerAccess, setManagerAccess] = useState(null);
    const [managerView, setManagerView] = useState(null);

    const HandleLogin = async (user) => {
        setLoading(true);
        setUser(user);
        await CheckAccess().then();
    };

    const CheckAccess = useCallback(async () => {
        if (isCheckingRef.current)
            return;

        isCheckingRef.current = true;
        try {
            const res = await axios.get('/api/access', { withCredentials: true });

            setAccess(res.data.access);
            setUser(res.data.user);
            setManagerAccess(res.data.manager_access);
            if (res.data.access && res.data.manager_access) {
                setManagerView(res.data.user.manager_view);
            }
            else {
                setManagerView(false);
            }
            await FetchPages();
        } catch (err) {
            setAccess(false);
            setManagerAccess(false);
            setUser(null);
            console.error(err);
        } finally {
            isCheckingRef.current = false;
            setLoading(false);
        }
    }, []);

    const FetchPages = async () => {
        try {
            const res = await axios.get('/api/pages', {withCredentials: true});

            if (Array.isArray(res.data)) {

                const mappedPages = res.data.map((page) => ({
                    ...page,
                    ...(page.component ? {component: componentMap[page.component] || NotFound } : {}),
                    subpages: page.subpages.map((subpage) => ({
                        ...subpage,
                        component: componentMap[subpage.component] || NotFound,
                    })),
                }));

                setPages(mappedPages);
            } else {
                setPages([]);
            }
        } catch (err) {
            console.error('Error fetching pages:', err);
            setPages([]);
        }
    };

    const Logout = () => {
        const navigate = useNavigate();
        useEffect(() => {
            const performLogout = async () => {
                try {
                    document.getElementById('root').classList.remove('staff');
                    document.getElementById('root').classList.remove('manager');
                    await axios.get('/api/logout', { withCredentials: true });
                } catch (err) {
                    console.error('Logout error', err);
                } finally {
                    navigate('/', { replace: true });
                    setUser(null);
                    setManagerView(false);
                    setLoading(false);
                }
            };
            performLogout().then();
        }, [navigate]);
        return null;
    };

    const CheckManagerAccess = useCallback(async () => {
        try {
            const res = await axios.get('/api/access', { withCredentials: true });
            setManagerAccess(res.data.manager_access);
            return res.data.manager_access;
        } catch (err) {
            console.error('Manager access check error: ', err);
            setManagerAccess(false);
            return false;
        }
    }, []);

    const ToggleManagerView = async (isManagerView) => {
        setLoading(true);
        try {
            const hasManagerAccess = await CheckManagerAccess();

            if (isManagerView && hasManagerAccess) {
                const res = await axios.post('/api/manager-view',
                    { user: user, manager_view: isManagerView },
                    { withCredentials: true }
                );
                if (res.data.success) {
                    setUser((prev) => ({ ...prev, manager_view: isManagerView }));
                    setManagerView(isManagerView);
                }
            } else {
                await axios.post('/api/manager-view',
                    { user: user, manager_view: false },
                    { withCredentials: true }
                );
                setUser((prev) => ({ ...prev, manager_view: false }));
                setManagerView(false);
            }
            await FetchPages();
        } catch (err) {
            console.error('View switching error: ', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        import(`./assets/palette-${theme}-${color}.css`).then();
        CheckAccess().then();
    }, [CheckAccess]);

    const SwitchToManagerView = () => {
        useEffect(() => {
            ToggleManagerView(true).then();
        }, []);
        return <Navigate to="/" replace />;
    };

    const SwitchToStaffView = () => {
        useEffect(() => {
            ToggleManagerView(false).then();
        }, []);
        return <Navigate to="/" replace />;
    };

    if (loading) {
        return <Loading />;
    }

    if (!user) {
        document.getElementById('root').classList.add('login');
        return (
            <ConnectivityProvider>
                <Login handleLogin={HandleLogin} />
                <ConnectivityPopup />
            </ConnectivityProvider>
        );
    } else {
        document.getElementById('root').classList.remove('login');
    }

    if (managerView) {
        document.getElementById('root').classList.add('manager');
        document.getElementById('root').classList.remove('staff');
    }
    else {
        document.getElementById('root').classList.add('staff');
        document.getElementById('root').classList.remove('manager');
    }

    if (!access) {
        return (
            <ConnectivityProvider>
                <Router>
                    <Routes>
                        <Route path="*" element={<Navigate to="/" replace />} />
                        <Route path="/" element={<NoAccess user={user} />} />
                        <Route path="logout" element={<Logout />} />
                    </Routes>
                </Router>
                <ConnectivityPopup />
            </ConnectivityProvider>
            )
    }
    return (
        <ConnectivityProvider>
            <Router>
                <Routes>
                    <Route path="/" element={
                        managerView ?
                            <ManagerView
                                user={user}
                                pages={pages}
                                switchView={ToggleManagerView}
                            />
                            :
                            <StaffView
                                user={user}
                                pages={pages}
                                switchView={ToggleManagerView}
                                hasManagerAccess={managerAccess}
                            />
                    }>
                        <Route index element={<Dashboard/>}/>
                        {pages
                            .filter((page) => user.role >= page.minRole)
                            .map((page) => (
                                <Route key={page.path} path={page.path}>
                                    <Route index element={page.component ? <page.component user={user}/> : <NotFound />} />
                                    {page.subpages
                                        .filter((subpage) => user.role >= subpage.minRole)
                                        .map((subpage) => (
                                            <Route
                                                key={`${page.path}/${subpage.path}`}
                                                path={subpage.path ? `${subpage.path}` : ''}
                                                index={!subpage.path}
                                                element={<subpage.component />}
                                            />
                                        ))
                                    }
                                    {page.path === 'posts' && (
                                        <Route
                                            path=":postId"
                                            element={<PostsIndex user={user} />}
                                        />
                                    )}
                                </Route>
                            ))}
                        {
                            managerView ?
                                <Route path="staff-view" element={<SwitchToStaffView/>} />
                                : <Route path="manager-view" element={<SwitchToManagerView/>} />
                        }
                        <Route path="logout" element={<Logout />} />
                        {/*<Route path="not-found" element={<NotFound />} />*/}
                        {/*<Route path="*" element={<Navigate to="/not-found" replace />} />*/}
                        <Route path="*" element={<NotFound />} />
                    </Route>
                </Routes>
                <ConnectivityPopup />
            </Router>
        </ConnectivityProvider>
    );
};

export default App;
