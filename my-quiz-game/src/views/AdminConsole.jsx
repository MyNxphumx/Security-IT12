import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from "socket.io-client"; // นำเข้า Socket.io
import '../css/AdminConsole.css';
import { API } from "../config";

// เชื่อมต่อกับ Backend Socket
const socket = io(API);

const AdminConsole = () => {
    const navigate = useNavigate();
    const [players, setPlayers] = useState([]);
    const [challenges, setChallenges] = useState([]); // แก้ไข Error: มั่นใจว่ามี State นี้
    const [msg, setMsg] = useState("");
    
    // --- [FORMS STATE] ---
    const [form, setForm] = useState({ 
        level_num: '', title: '', description: '', 
        sql_logic: 'string', target_identifier: '', 
        access_key: '', hint_1: '', hint_2: '',
        query_template: '', base_points: 0, category: 'Beginner'
    });

    const [userForm, setUserForm] = useState({ 
        user_id: '', new_username: '', new_password: '', new_role: 0, new_score: 0 
    });

    // --- [FETCH DATA] ---
    const fetchData = async () => {
        try {
            const pRes = await fetch(`${API}/api/admin/players`);
            const cRes = await fetch(`${API}/api/admin/challenges`);
            if (pRes.ok) setPlayers(await pRes.json());
            if (cRes.ok) setChallenges(await cRes.json());
        } catch (err) {
            console.error("Fetch Error:", err);
            setMsg("SYSTEM_ERROR: CONNECTION_FAILED");
        }
    };

    useEffect(() => {
        fetchData();

        // ฟังคำสั่งจาก Server เมื่อมีการอัปเดตข้อมูล
        socket.on("update_data", () => {
            console.log("📡 Real-time Update Received");
            fetchData();
        });

        // Cleanup เมื่อปิด Component
        return () => socket.off("update_data");
    }, []);

    // --- [CHALLENGE ACTIONS] ---
    const handleSaveChallenge = async (e) => {
        e.preventDefault();
        const res = await fetch(`${API}/api/admin/challenges/upsert`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form)
        });
        if (res.ok) {
            setMsg(`CHALLENGE_SYNC: Level ${form.level_num} updated.`);
            // ล้างฟอร์ม
            setForm({ level_num: '', title: '', description: '', sql_logic: 'string', target_identifier: '', access_key: '', hint_1: '', hint_2: '', query_template: '', base_points: 0, category: 'Beginner' });
            fetchData();
            if (res.ok) {
                // ...
                socket.emit("admin_update"); // 📡 ส่งสัญญาณบอกว่า Admin มีการเปลี่ยนแปลงข้อมูล
                fetchData();
            }

        }
    };

    const handleDeleteChallenge = async (lvl) => {
        if (!window.confirm(`DELETE Level ${lvl}?`)) return;
        const res = await fetch(`${API}/api/admin/challenges/delete/${lvl}`, { method: 'DELETE' });
        if (res.ok) {
            setMsg(`CHALLENGE_DELETED: Level ${lvl} removed.`);
            fetchData();
        }
    };

    // --- [PLAYER ACTIONS] ---
    const prepareEditPlayer = (p) => {
        setUserForm({
            user_id: p.id,
            new_username: p.username,
            new_password: '', 
            new_role: p.role,
            new_score: p.score
        });
        setMsg(`EDIT_MODE: Operator #${p.id} active.`);
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        const res = await fetch(`${API}/api/admin/players/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userForm)
        });
        if (res.ok) {
            setMsg(`CREDENTIALS_UPDATED: ${userForm.new_username} synchronised.`);
            setUserForm({ user_id: '', new_username: '', new_password: '', new_role: 0, new_score: 0 });
            fetchData();

            if (res.ok) {
                // ...
                socket.emit("admin_update"); // 📡 ส่งสัญญาณเพื่อให้ Leaderboard ขยับทันที
                fetchData();
            }
        }
    };

    const handlePlayerAction = async (action, id) => {
        if (!window.confirm(`Confirm ${action.toUpperCase()} for Operator #${id}?`)) return;
        const res = await fetch(`${API}/api/admin/players/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, id })
        });
        if (res.ok) {
            setMsg(`SYSTEM: Action [${action}] executed.`);
            fetchData();
        }
    };

    return (
        <div className="admin-body">
            <div className="admin-container">
                <header className="header">
                    <h1>SUPER_ADMIN_CONSOLE <span className="live-tag">LIVE</span></h1>
                    <button className="btn-exit" onClick={() => navigate('/dashboard')}>EXIT_ROOT</button>
                </header>

                {msg && <div className="msg-box">{msg}</div>}

                <div className="grid">
                    {/* --- Side Panel: Forms --- */}
                    <div className="side-panel">
                        <div className="card">
                            <h2>DEPLOY_MISSION_CORE</h2>
                            <form onSubmit={handleSaveChallenge}>
                                <div className="form-group-row">
                                    <div style={{flex:1}}><label>LVL_NUM</label><input type="number" value={form.level_num} onChange={e => setForm({...form, level_num: e.target.value})} required /></div>
                                    <div style={{flex:2}}><label>CATEGORY</label>
                                        <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                                            <option value="Beginner">Beginner</option>
                                            <option value="Intermediate">Intermediate</option>
                                            <option value="Advanced">Advanced</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <label>TITLE</label>
                                <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
                                
                                <label>DESCRIPTION</label>
                                <textarea rows="2" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                                
                                <div className="form-group-row">
                                    <div style={{flex:1}}><label>BASE_POINTS</label><input type="number" value={form.base_points} onChange={e => setForm({...form, base_points: e.target.value})} /></div>
                                    <div style={{flex:1}}><label>SQL_LOGIC</label>
                                        <select value={form.sql_logic} onChange={e => setForm({...form, sql_logic: e.target.value})}>
                                            <option value="string">String Match</option>
                                            <option value="result">Result Set Match</option>
                                        </select>
                                    </div>
                                </div>

                                <label>QUERY_TEMPLATE</label>
                                <input type="text" placeholder="SELECT * FROM..." value={form.query_template} onChange={e => setForm({...form, query_template: e.target.value})} />
                                
                                <label style={{color: '#fbbf24'}}>TARGET_IDENTIFIER (EXPECTED)</label>
                                <input type="text" value={form.target_identifier} onChange={e => setForm({...form, target_identifier: e.target.value})} required />
                                
                                <label style={{color: '#fbbf24'}}>ACCESS_KEY (PAYLOAD)</label>
                                <input type="text" value={form.access_key} onChange={e => setForm({...form, access_key: e.target.value})} />

                                <div className="form-group-row">
                                    <div style={{flex:1}}><label>HINT_1</label><input type="text" value={form.hint_1} onChange={e => setForm({...form, hint_1: e.target.value})} /></div>
                                    <div style={{flex:1}}><label>HINT_2</label><input type="text" value={form.hint_2} onChange={e => setForm({...form, hint_2: e.target.value})} /></div>
                                </div>

                                <button type="submit" className="btn btn-save">SYNC_DATABASE</button>
                            </form>
                        </div>

                        <div className="card">
                            <h2>PLAYER_OVERRIDE</h2>
                            <form onSubmit={handleUpdateUser}>
                                <div className="form-group-row">
                                    <div style={{flex:1}}><label>ID</label><input type="number" value={userForm.user_id} className="input-readonly" readOnly /></div>
                                    <div style={{flex:1}}>
                                        <label>ROLE</label>
                                        <select value={userForm.new_role} onChange={e => setUserForm({...userForm, new_role: parseInt(e.target.value)})}>
                                            <option value={0}>PLAYER</option>
                                            <option value={1}>ADMIN</option>
                                        </select>
                                    </div>
                                </div>
                                <label>NEW_CODENAME</label>
                                <input type="text" value={userForm.new_username} onChange={e => setUserForm({...userForm, new_username: e.target.value})} required />
                                <label>NEW_ACCESS_KEY</label>
                                <input type="text" value={userForm.new_password} onChange={e => setUserForm({...userForm, new_password: e.target.value})} placeholder="Keep blank to stay same" />
                                <label>SCORE_OVERRIDE</label>
                                <input type="number" value={userForm.new_score} onChange={e => setUserForm({...userForm, new_score: parseInt(e.target.value)})} />
                                <button type="submit" className="btn btn-edit">UPDATE_CREDENTIALS</button>
                            </form>
                        </div>
                    </div>

                    {/* --- Main Panel: Tables --- */}
                    <div className="main-panel">
                        <div className="card">
                            <h2>MISSION_DATA_CORE</h2>
                            <div className="table-responsive">
                                <table className="fixed-table">
                                    <thead>
                                        <tr>
                                            <th style={{width: '8%'}}>LVL</th>
                                            <th style={{width: '22%'}}>TITLE</th>
                                            <th style={{width: '25%'}}>IDENTIFIER</th>
                                            <th style={{width: '25%'}}>ACCESS_KEY</th>
                                            <th style={{width: '20%'}}>OPERATIONS</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {challenges.map(c => (
                                            <tr key={c.level_num}>
                                                <td><strong>{c.level_num}</strong></td>
                                                <td className="truncate-cell" title={c.title}>{c.title}</td>
                                                <td className="truncate-cell" style={{color:'#10b981'}}><code>{c.target_identifier}</code></td>
                                                <td className="truncate-cell" style={{color:'#60a5fa'}}>{c.access_key}</td>
                                                <td>
                                                    <button className="action-link" onClick={() => setForm(c)}>EDIT</button>
                                                    <button className="action-link btn-del" onClick={() => handleDeleteChallenge(c.level_num)}>DEL</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="card">
                            <h2>OPERATOR_REGISTRY</h2>
                            <div className="table-responsive">
                                <table className="fixed-table">
                                    <thead>
                                        <tr>
                                            <th style={{width: '10%'}}>ID</th>
                                            <th style={{width: '25%'}}>CODENAME</th>
                                            <th style={{width: '15%'}}>ROLE</th>
                                            <th style={{width: '20%'}}>SCORE</th>
                                            <th style={{width: '30%'}}>OPERATIONS</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {players.map(p => (
                                            <tr key={p.id}>
                                                <td>#{p.id}</td>
                                                <td style={{color:'#fff'}}>{p.username}</td>
                                                <td><span className={p.role === 1 ? 'badge-admin' : 'badge-user'}>{p.role === 1 ? 'ADMIN' : 'PLAYER'}</span></td>
                                                <td style={{color:'#fbbf24'}}>{p.score?.toLocaleString()}</td>
                                                <td>
                                                    <button className="action-link" onClick={() => prepareEditPlayer(p)}>EDIT</button>
                                                    {p.role !== 1 && (
                                                        <>
                                                            <button className="action-link" onClick={() => handlePlayerAction('make_admin', p.id)}>+ADM</button>
                                                            <button className="action-link btn-del" onClick={() => handlePlayerAction('ban', p.id)}>BAN</button>
                                                        </>
                                                    )}
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
            
            <style jsx>{`
                .truncate-cell { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 0; }
                .fixed-table { table-layout: fixed; width: 100%; border-collapse: collapse; }
                .input-readonly { background: #1e293b !important; color: #94a3b8 !important; cursor: not-allowed; }
                .form-group-row { display: flex; gap: 10px; margin-bottom: 5px; }
                .live-tag { font-size: 10px; background: #ef4444; color: white; padding: 2px 6px; border-radius: 4px; vertical-align: middle; margin-left: 10px; animation: pulse 2s infinite; }
                @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
                .table-responsive { overflow-x: auto; }
            `}</style>
        </div>
    );
};

export default AdminConsole;