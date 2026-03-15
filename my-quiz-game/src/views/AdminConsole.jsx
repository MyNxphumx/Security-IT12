import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/AdminConsole.css';
import { API } from "../config";

const AdminConsole = () => {
    const navigate = useNavigate();
    const [players, setPlayers] = useState([]);
    const [challenges, setChallenges] = useState([]);
    const [msg, setMsg] = useState("");
    
    // Form สำหรับ Challenge
    const [form, setForm] = useState({ 
        level_num: '', title: '', description: '', 
        sql_logic: 'string', target_identifier: '', 
        access_key: '', hint_1: '', hint_2: '' 
    });

    // Form สำหรับ Player Override
    const [userForm, setUserForm] = useState({ user_id: '', new_username: '', new_password: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            
            const pRes = await fetch(`${API}/api/admin/players`);
            const cRes = await fetch(`${API}/api/admin/challenges`);
            setPlayers(await pRes.json());
            setChallenges(await cRes.json());
        } catch (err) {
            console.error("Fetch Error:", err);
        }
    };

    // --- ส่วนจัดการผู้เล่น (Reset, Ban, Make Admin) ---
    const handlePlayerAction = async (action, id) => {
        if (!window.confirm(`Confirm ${action.toUpperCase()} for ID #${id}?`)) return;
        const res = await fetch(`${API}/api/admin/players/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, id })
        });
        if (res.ok) {
            setMsg(`SYSTEM: User #${id} updated (${action})`);
            fetchData();
        }
    };

    // --- ส่วนเพิ่ม/แก้ไขโจทย์ (Upsert) ---
    const handleSaveChallenge = async (e) => {
        e.preventDefault();
        const res = await fetch(`/admin/challenges/upsert`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form)
        });
        if (res.ok) {
            setMsg(`CHALLENGE_SYNC: Level ${form.level_num} updated.`);
            setForm({ level_num: '', title: '', description: '', sql_logic: 'string', target_identifier: '', access_key: '', hint_1: '', hint_2: '' });
            fetchData();
        }
    };

    const handleDeleteChallenge = async (lvl) => {
        if (!window.confirm(`DELETE Level ${lvl}?`)) return;
        const res = await fetch(`${API}/api/admin/admin/challenges/delete/${lvl}`, { method: 'DELETE' });
        if (res.ok) {
            setMsg(`CHALLENGE_DELETED: Level ${lvl} removed.`);
            fetchData();
        }
    };

    // --- ส่วน Player Override (Credentials) ---
    const handleUpdateUser = async (e) => {
        e.preventDefault();
        const res = await fetch(`${API}/api/admin/admin/players/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userForm)
        });
        if (res.ok) {
            setMsg(`CREDENTIALS_UPDATED: Operator ${userForm.new_username} updated.`);
            setUserForm({ user_id: '', new_username: '', new_password: '' });
            fetchData();
        }
    };

    return (
        <div className="admin-body">
            <div className="admin-container">
                <header className="header">
                    <h1>SUPER_ADMIN_CONSOLE</h1>
                    <button className="btn-exit" onClick={() => navigate('/dashboard')}>EXIT_ROOT</button>
                </header>

                {msg && <div className="msg-box"> {msg}</div>}

                <div className="grid">
                    {/* --- Side Panel: Forms --- */}
                    <div className="side-panel">
                        {/* 1. DEPLOY MISSION CARD */}
                        <div className="card">
                            <h2>DEPLOY_MISSION_CORE</h2>
                            <form onSubmit={handleSaveChallenge}>
                                <label>LVL_NUM (Primary Key)</label>
                                <input type="number" value={form.level_num} onChange={e => setForm({...form, level_num: e.target.value})} required />
                                
                                <label>TITLE</label>
                                <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
                                
                                <label>DESCRIPTION</label>
                                <textarea rows="2" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                                
                                <label>SQL_LOGIC</label>
                                <select value={form.sql_logic} onChange={e => setForm({...form, sql_logic: e.target.value})}>
                                    <option value="string">' OR '1'='1' (String)</option>
                                    <option value="numeric">OR 1=1 (Numeric)</option>
                                    <option value="blind">Blind Injection</option>
                                </select>
                                
                                <label style={{color: '#fbbf24'}}>TARGET_IDENTIFIER</label>
                                <input type="text" value={form.target_identifier} onChange={e => setForm({...form, target_identifier: e.target.value})} required />
                                
                                <label style={{color: '#fbbf24'}}>ACCESS_KEY (Payload)</label>
                                <input type="text" value={form.access_key} onChange={e => setForm({...form, access_key: e.target.value})} />
                                
                                <label>HINT_1 / HINT_2</label>
                                <input type="text" placeholder="Hint 1" value={form.hint_1} onChange={e => setForm({...form, hint_1: e.target.value})} />
                                <input type="text" placeholder="Hint 2" value={form.hint_2} onChange={e => setForm({...form, hint_2: e.target.value})} />
                                
                                <button type="submit" className="btn btn-save">SYNC_DATABASE</button>
                            </form>
                        </div>

                        {/* 2. PLAYER OVERRIDE CARD */}
                        <div className="card">
                            <h2>PLAYER_OVERRIDE</h2>
                            <form onSubmit={handleUpdateUser}>
                                <label>PLAYER_ID</label>
                                <input type="number" value={userForm.user_id} onChange={e => setUserForm({...userForm, user_id: e.target.value})} required />
                                <label>NEW_CODENAME</label>
                                <input type="text" value={userForm.new_username} onChange={e => setUserForm({...userForm, new_username: e.target.value})} required />
                                <label>NEW_ACCESS_KEY</label>
                                <input type="text" value={userForm.new_password} onChange={e => setUserForm({...userForm, new_password: e.target.value})} placeholder="Blank to keep old" />
                                <button type="submit" className="btn btn-edit">UPDATE_CREDENTIALS</button>
                            </form>
                        </div>
                    </div>

                    {/* --- Main Panel: Tables --- */}
                    <div className="main-panel">
                        {/* MISSION TABLE */}
                        <div className="card">
                            <h2>MISSION_DATA_CORE</h2>
                            <table>
                                <thead>
                                    <tr><th>LVL</th><th>TITLE</th><th>IDENTIFIER</th><th>ACTIONS</th></tr>
                                </thead>
                                <tbody>
                                    {challenges.map(c => (
                                        <tr key={c.level_num}>
                                            <td><strong>{c.level_num}</strong></td>
                                            <td style={{color:'#fbbf24'}}>{c.title}</td>
                                            <td style={{color:'#10b981'}}><code>{c.target_identifier}</code></td>
                                            <td>
                                                <button className="action-link" onClick={() => setForm(c)}>EDIT</button>
                                                <button className="action-link btn-del" onClick={() => handleDeleteChallenge(c.level_num)}>DEL</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* OPERATOR REGISTRY TABLE */}
                        <div className="card">
                            <h2>OPERATOR_REGISTRY</h2>
                            <table>
                                <thead>
                                    <tr><th>ID</th><th>CODENAME</th><th>ROLE</th><th>SCORE</th><th>OPERATIONS</th></tr>
                                </thead>
                                <tbody>
                                    {players.map(p => (
                                        <tr key={p.id}>
                                            <td>#{p.id}</td>
                                            <td style={{color:'#fff'}}>{p.username}</td>
                                            <td><span className={p.role === 1 ? 'badge-admin' : 'badge-user'}>{p.role === 1 ? 'ADMIN' : 'PLAYER'}</span></td>
                                            <td style={{color:'#fbbf24'}}>{p.score.toLocaleString()}</td>
                                            <td>
                                                {p.role !== 1 ? (
                                                    <>
                                                        <button className="action-link" onClick={() => handlePlayerAction('make_admin', p.id)}>+ADM</button>
                                                        <button className="action-link" onClick={() => handlePlayerAction('reset', p.id)}>RESET</button>
                                                        <button className="action-link btn-del" onClick={() => handlePlayerAction('ban', p.id)}>BAN</button>
                                                    </>
                                                ) : <span style={{color:'#334155'}}>[ROOT_PROTECTED]</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminConsole;