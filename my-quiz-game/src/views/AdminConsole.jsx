import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from "socket.io-client"; 
import '../css/AdminConsole.css';
import { API } from "../config";

const socket = io(API);

const AdminConsole = () => {
    const navigate = useNavigate();
    const [players, setPlayers] = useState([]);
    const [challenges, setChallenges] = useState([]); 
    const [msg, setMsg] = useState("");
    
    // 1. แก้ไข State: เปลี่ยน access_key เป็น flag_value
    const [form, setForm] = useState({ 
        level_num: '', title: '', description: '', 
        sql_logic: 'string', target_identifier: '', 
        flag_value: '', // เปลี่ยนจุดนี้
        hint_1: '', hint_2: '',
        query_template: '', base_points: 0, category: 'Beginner'
    });

    const [userForm, setUserForm] = useState({ 
        user_id: '', new_username: '', new_password: '', new_role: 0, new_score: 0 
    });

    const fetchData = async () => {
        try {
            const pRes = await fetch(`${API}/api/admin/players`);
            const cRes = await fetch(`${API}/api/admin/challenges`);
            if (pRes.ok) setPlayers(await pRes.json());
            if (cRes.ok) setChallenges(await cRes.json());
        } catch (err) {
            console.error("Fetch Error:", err);
            setMsg("⚠️ SYSTEM_ERROR: CONNECTION_FAILED");
        }
    };

    useEffect(() => {
        fetchData();
        socket.on("update_data", () => {
            console.log("📡 Real-time Update Received");
            fetchData();
        });
        return () => socket.off("update_data");
    }, []);

    const handleSaveChallenge = async (e) => {
        e.preventDefault();
        
        // แปลง flag_value จาก String เป็น Array ก่อนส่ง (ตัดช่องว่างให้ด้วย)
        const flagArray = typeof form.flag_value === 'string' 
            ? form.flag_value.split(',').map(item => item.trim()) 
            : form.flag_value;

        const payload = {
            ...form,
            id: parseInt(form.level_num) || 0,
            level_num: parseInt(form.level_num) || 0,
            base_points: parseInt(form.base_points) || 0,
            flag_value: flagArray // ส่งไปเป็น Array [ "flag1", "flag2" ]
        };

        try {
            const res = await fetch(`${API}/api/admin/challenges/upsert`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setMsg(`✅ CHALLENGE_SYNC: Level ${payload.level_num} updated.`);
                setForm({ 
                    level_num: '', title: '', description: '', 
                    sql_logic: 'string', target_identifier: '', 
                    flag_value: '', // ล้างค่า flag_value
                    hint_1: '', hint_2: '', 
                    query_template: '', base_points: 0, category: 'Beginner' 
                });
                
                socket.emit("admin_update"); 
                fetchData();
            } else {
                setMsg("❌ ERROR: FAILED_TO_SYNC_DATABASE");
            }
        } catch (err) {
            setMsg("⚠️ SYSTEM_ERROR: CONNECTION_FAILED");
        }
    };

    const handleDeleteChallenge = async (lvl) => {
        if (!window.confirm(`DELETE Level ${lvl}?`)) return;
        try {
            const res = await fetch(`${API}/api/admin/challenges/delete/${lvl}`, { method: 'DELETE' });
            if (res.ok) {
                setMsg(`🗑️ CHALLENGE_DELETED: Level ${lvl} removed.`);
                socket.emit("admin_update");
                fetchData();
            }
        } catch (err) {
            setMsg("❌ ERROR: DELETE_FAILED");
        }
    };

    const prepareEditPlayer = (p) => {
        setUserForm({
            user_id: p.id,
            new_username: p.username,
            new_password: '', 
            new_role: p.role,
            new_score: p.score
        });
        setMsg(`🛠️ EDIT_MODE: Operator #${p.id} active.`);
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API}/api/admin/players/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userForm)
            });
            if (res.ok) {
                setMsg(`🚀 CREDENTIALS_UPDATED: ${userForm.new_username} synchronised.`);
                setUserForm({ user_id: '', new_username: '', new_password: '', new_role: 0, new_score: 0 });
                socket.emit("admin_update"); 
                fetchData();
            }
        } catch (err) {
            setMsg("❌ ERROR: UPDATE_FAILED");
        }
    };

    const handlePlayerAction = async (action, id) => {
        if (!window.confirm(`Confirm ${action.toUpperCase()} for Operator #${id}?`)) return;
        try {
            const res = await fetch(`${API}/api/admin/players/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, id })
            });
            if (res.ok) {
                setMsg(`⚡ SYSTEM: Action [${action}] executed.`);
                socket.emit("admin_update");
                fetchData();
            }
        } catch (e) {
            setMsg("❌ ERROR: ACTION_FAILED");
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
                        
                        {/* --- ส่วนที่แก้ไข: จัดการ FLAG_VALUE (Array) ใน Input --- */}
                        <label style={{color: '#fbbf24'}}>FLAG_VALUE (ARRAY: separate with comma)</label>
                        <input 
                            type="text" 
                            placeholder="flag1, flag2" 
                            /* ถ้าข้อมูลเป็น Array ให้ join เป็น String เพื่อให้พิมพ์แก้ได้ */
                            value={Array.isArray(form.flag_value) ? form.flag_value.join(', ') : form.flag_value || ''} 
                            onChange={e => setForm({...form, flag_value: e.target.value})} 
                        />
                        <small style={{color:'#64748b', display:'block', marginBottom:'10px'}}>* Example: flag_1, flag_2</small>

                        <div className="form-group-row">
                            <div style={{flex:1}}><label>HINT_1</label><input type="text" value={form.hint_1} onChange={e => setForm({...form, hint_1: e.target.value})} /></div>
                            <div style={{flex:1}}><label>HINT_2</label><input type="text" value={form.hint_2} onChange={e => setForm({...form, hint_2: e.target.value})} /></div>
                        </div>

                        <button type="submit" className="btn btn-save">SYNC_DATABASE</button>
                    </form>
                </div>
            </div>

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
                                    <th style={{width: '25%'}}>FLAG_VALUE</th>
                                    <th style={{width: '20%'}}>OPERATIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {challenges.map(c => (
                                    <tr key={c.level_num}>
                                        <td><strong>{c.level_num}</strong></td>
                                        <td className="truncate-cell" title={c.title}>{c.title}</td>
                                        <td className="truncate-cell" style={{color:'#10b981'}}><code>{c.target_identifier}</code></td>
                                        {/* --- ส่วนที่แก้ไข: แสดงผล FLAG_VALUE ในตาราง --- */}
                                        <td className="truncate-cell" style={{color:'#60a5fa'}}>
                                            {Array.isArray(c.flag_value) ? c.flag_value.join(' | ') : c.flag_value}
                                        </td>
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
            </div>
        </div>
    </div>
</div>
    );
};

export default AdminConsole;