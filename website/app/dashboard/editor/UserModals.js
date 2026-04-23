'use client';
import { useState, useEffect } from 'react';

/**
 * UserModals - Shared modal system for both Dashboard and Editor pages.
 * Listens for CustomEvent 'openUserModal' on window to open modals from editor.
 * Also accepts direct prop `openModal` from dashboard page.
 */
export default function UserModals({ openModal, onClose }) {
  const [activeModal, setActiveModal] = useState(null);
  const [toast, setToast] = useState(null);

  // Password
  const [pwOld, setPwOld] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwDone, setPwDone] = useState(false);

  // Team
  const [teamMembers, setTeamMembers] = useState([
    { name: 'Bạn (Admin)', email: 'admin@b2vision.com', role: 'Chủ sở hữu' },
  ]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  // Bug
  const [bugTitle, setBugTitle] = useState('');
  const [bugDesc, setBugDesc] = useState('');
  const [bugSending, setBugSending] = useState(false);
  const [bugSent, setBugSent] = useState(false);

  // Upgrade / Payment
  const [paymentCode, setPaymentCode] = useState('');
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);

  // Logout / Delete Account
  const [loggingOut, setLoggingOut] = useState(false);
  const [deletingAcc, setDeletingAcc] = useState(false);
  const [deleteConfText, setDeleteConfText] = useState('');

  // Listen for CustomEvent from editor page
  useEffect(() => {
    const handler = (e) => setActiveModal(e.detail);
    window.addEventListener('openUserModal', handler);
    return () => window.removeEventListener('openUserModal', handler);
  }, []);

  // Auto-polling for payment check
  useEffect(() => {
    if (activeModal === 'upgrade' && (!paymentResult || !paymentResult.found)) {
      const interval = setInterval(() => {
        checkPayment(false); // pass false to avoid throwing errors on UI/spam
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [activeModal, paymentResult]);

  // Also listen for prop changes
  useEffect(() => {
    if (openModal) setActiveModal(openModal);
  }, [openModal]);

  const close = () => {
    setActiveModal(null);
    setPwOld(''); setPwNew(''); setPwConfirm(''); setPwSaving(false); setPwDone(false);
    setBugTitle(''); setBugDesc(''); setBugSending(false); setBugSent(false);
    setPaymentResult(null); setCheckingPayment(false);
    if (onClose) onClose();
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handlePasswordChange = async () => {
    if (!pwOld || !pwNew || !pwConfirm) { showToast('Vui lòng điền đầy đủ.', 'error'); return; }
    if (pwNew.length < 8) { showToast('Mật khẩu mới ít nhất 8 ký tự.', 'error'); return; }
    if (pwNew !== pwConfirm) { showToast('Mật khẩu xác nhận không khớp.', 'error'); return; }
    setPwSaving(true);
    await new Promise(r => setTimeout(r, 1800));
    setPwSaving(false); setPwDone(true);
    showToast('Đổi mật khẩu thành công! ✅');
    setTimeout(close, 1500);
  };

  const handleInvite = async () => {
    if (!inviteEmail || !inviteEmail.includes('@')) { showToast('Email không hợp lệ.', 'error'); return; }
    setInviting(true);
    await new Promise(r => setTimeout(r, 1200));
    setTeamMembers(prev => [...prev, { name: inviteEmail.split('@')[0], email: inviteEmail, role: 'Thành viên' }]);
    showToast(`Đã mời ${inviteEmail} vào nhóm! 🎉`);
    setInviteEmail(''); setInviting(false);
  };

  const handleBugReport = async () => {
    if (!bugTitle.trim()) { showToast('Nhập tiêu đề lỗi.', 'error'); return; }
    setBugSending(true);
    await new Promise(r => setTimeout(r, 1500));
    setBugSending(false); setBugSent(true);
    showToast('Báo lỗi đã gửi thành công! 🐛✅');
    setTimeout(close, 2000);
  };

  // Generate unique payment code
  useEffect(() => {
    if (activeModal === 'upgrade' && !paymentCode) {
      setPaymentCode('PRO' + Math.random().toString(36).substring(2, 8).toUpperCase());
    }
  }, [activeModal]);

  const checkPayment = async (showToastOnFail = true) => {
    setCheckingPayment(true);
    try {
      const res = await fetch('/api/check-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: paymentCode, amount: 299000 })
      });
      const data = await res.json();
      if (data.success && data.paid) {
        setPaymentResult({ found: true });
        showToast('Nâng cấp PRO thành công! Cảm ơn bạn.', 'success');
        setTimeout(() => close(), 3000);
      } else {
        setPaymentResult({ found: false });
        if (showToastOnFail) showToast('Chưa tìm thấy giao dịch. Vui lòng thử lại sau.', 'error');
      }
    } catch(err) {
      if (showToastOnFail) showToast('Lỗi khi kiểm tra thanh toán.', 'error');
    }
    setCheckingPayment(false);
  };

  if (!activeModal) return toast ? <Toast toast={toast} /> : null;

  const Overlay = ({ children }) => (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:99999 }} onClick={close}>
      {toast && <Toast toast={toast} />}
      <div style={{ background:'#1a1a2e',borderRadius:16,border:'1px solid rgba(255,255,255,0.1)',boxShadow:'0 24px 80px rgba(0,0,0,0.5)',maxWidth:480,width:'92%',maxHeight:'85vh',overflowY:'auto' }} onClick={e=>e.stopPropagation()}>
        {children}
      </div>
    </div>
  );

  const Input = ({ label, ...props }) => (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:'block',fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.5)',marginBottom:6 }}>{label}</label>
      <input style={{ width:'100%',padding:'12px 16px',background:'#292934',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,color:'#fff',fontSize:14,outline:'none' }} {...props} />
    </div>
  );

  const Btn = ({ children, onClick, disabled, variant = 'primary', ...rest }) => {
    const bg = variant === 'cancel' ? 'transparent' : variant === 'success' ? '#10b981' : variant === 'danger' ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'linear-gradient(135deg,#8b5cf6,#6366f1)';
    return (
      <button onClick={onClick} disabled={disabled} style={{ flex:1,padding:'12px',borderRadius:10,border: variant==='cancel'?'1px solid rgba(255,255,255,0.1)':'none',background:bg,color:variant==='cancel'?'#999':'#fff',cursor:'pointer',fontSize:14,fontWeight:variant==='cancel'?600:700,opacity:disabled?0.6:1 }} {...rest}>{children}</button>
    );
  };

  return (
    <>
      {/* PASSWORD */}
      {activeModal === 'password' && (
        <Overlay>
          <div style={{ padding:28 }}>
            <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:24 }}>
              <div style={{ width:40,height:40,borderRadius:10,background:'rgba(139,92,246,0.2)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                <span className="material-symbols-outlined" style={{ color:'#8b5cf6' }}>lock</span>
              </div>
              <h3 style={{ margin:0,color:'#fff',fontSize:18,fontWeight:700 }}>Đổi mật khẩu</h3>
            </div>
            <Input label="Mật khẩu hiện tại" type="password" placeholder="Nhập mật khẩu cũ" value={pwOld} onChange={e=>setPwOld(e.target.value)} />
            <Input label="Mật khẩu mới" type="password" placeholder="Tối thiểu 8 ký tự" value={pwNew} onChange={e=>setPwNew(e.target.value)} />
            <Input label="Xác nhận" type="password" placeholder="Nhập lại mật khẩu mới" value={pwConfirm} onChange={e=>setPwConfirm(e.target.value)} />
            <div style={{ display:'flex',gap:12,marginTop:20 }}>
              <Btn variant="cancel" onClick={close}>Hủy</Btn>
              <Btn onClick={handlePasswordChange} disabled={pwSaving} variant={pwDone?'success':'primary'}>{pwSaving?'⏳ Đang lưu...':pwDone?'✅ Thành công!':'Lưu mật khẩu'}</Btn>
            </div>
          </div>
        </Overlay>
      )}

      {/* TEAM */}
      {activeModal === 'team' && (
        <Overlay>
          <div style={{ padding:28 }}>
            <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:24 }}>
              <div style={{ width:40,height:40,borderRadius:10,background:'rgba(99,102,241,0.2)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                <span className="material-symbols-outlined" style={{ color:'#6366f1' }}>group</span>
              </div>
              <h3 style={{ margin:0,color:'#fff',fontSize:18,fontWeight:700 }}>Quản lý đội nhóm</h3>
            </div>
            <p style={{ fontSize:12,color:'rgba(255,255,255,0.4)',marginBottom:12,fontWeight:600 }}>THÀNH VIÊN ({teamMembers.length})</p>
            {teamMembers.map((m,i) => (
              <div key={i} style={{ display:'flex',alignItems:'center',gap:12,padding:'12px 14px',background:'rgba(255,255,255,0.03)',borderRadius:10,marginBottom:6,border:'1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ width:36,height:36,borderRadius:18,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:14,fontWeight:700 }}>{m.name[0].toUpperCase()}</div>
                <div style={{ flex:1 }}>
                  <p style={{ color:'#fff',fontSize:13,fontWeight:600,margin:0 }}>{m.name}</p>
                  <p style={{ color:'rgba(255,255,255,0.4)',fontSize:11,margin:0 }}>{m.email}</p>
                </div>
                <span style={{ fontSize:11,color:'rgba(255,255,255,0.3)',background:'rgba(255,255,255,0.05)',padding:'4px 10px',borderRadius:6,fontWeight:600 }}>{m.role}</span>
              </div>
            ))}
            <p style={{ fontSize:12,color:'rgba(255,255,255,0.4)',marginBottom:8,marginTop:16,fontWeight:600 }}>MỜI THÀNH VIÊN MỚI</p>
            <div style={{ display:'flex',gap:8 }}>
              <input style={{ flex:1,padding:'12px 16px',background:'#292934',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,color:'#fff',fontSize:13,outline:'none' }} placeholder="email@example.com" value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} />
              <Btn onClick={handleInvite} disabled={inviting} style={{ flex:'unset',padding:'12px 20px',whiteSpace:'nowrap' }}>{inviting?'⏳':'+ Mời'}</Btn>
            </div>
            <Btn variant="cancel" onClick={close} style={{ width:'100%',marginTop:16 }}>Đóng</Btn>
          </div>
        </Overlay>
      )}

      {/* BUG REPORT */}
      {activeModal === 'bug' && (
        <Overlay>
          <div style={{ padding:28 }}>
            <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:24 }}>
              <div style={{ width:40,height:40,borderRadius:10,background:'rgba(239,68,68,0.2)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                <span className="material-symbols-outlined" style={{ color:'#ef4444' }}>bug_report</span>
              </div>
              <h3 style={{ margin:0,color:'#fff',fontSize:18,fontWeight:700 }}>Báo lỗi</h3>
            </div>
            <Input label="Tiêu đề lỗi" type="text" placeholder="VD: Video không export được" value={bugTitle} onChange={e=>setBugTitle(e.target.value)} />
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block',fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.5)',marginBottom:6 }}>Mô tả chi tiết</label>
              <textarea style={{ width:'100%',padding:'12px 16px',background:'#292934',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,color:'#fff',fontSize:14,outline:'none',resize:'none',height:100 }} placeholder="Mô tả lỗi bạn gặp..." value={bugDesc} onChange={e=>setBugDesc(e.target.value)} />
            </div>
            <div style={{ display:'flex',gap:12,marginTop:20 }}>
              <Btn variant="cancel" onClick={close}>Hủy</Btn>
              <Btn variant={bugSent?'success':'danger'} onClick={handleBugReport} disabled={bugSending}>{bugSending?'⏳ Đang gửi...':bugSent?'✅ Đã gửi!':'🐛 Gửi báo lỗi'}</Btn>
            </div>
          </div>
        </Overlay>
      )}

      {/* SUPPORT */}
      {activeModal === 'support' && (
        <Overlay>
          <div style={{ padding:28 }}>
            <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:24 }}>
              <div style={{ width:40,height:40,borderRadius:10,background:'rgba(16,185,129,0.2)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                <span className="material-symbols-outlined" style={{ color:'#10b981' }}>support_agent</span>
              </div>
              <h3 style={{ margin:0,color:'#fff',fontSize:18,fontWeight:700 }}>Hỗ trợ</h3>
            </div>
            {[
              { icon:'person',label:'Hỗ trợ viên',value:'Trần Đình Nhật',color:'#8b5cf6' },
              { icon:'call',label:'Số điện thoại',value:'0867809383',color:'#10b981' },
              { icon:'mail',label:'Email',value:'nhat49465@gmail.com',color:'#6366f1',href:'mailto:nhat49465@gmail.com' },
              { icon:'public',label:'Facebook',value:'Trần Đình Nhật',color:'#0084ff',href:'https://www.facebook.com/tran.inh.nhat.986822' },
              { icon:'send',label:'Telegram',value:'@tlong189231',color:'#26A5E4',href:'https://t.me/tlong189231' },
            ].map((c,i) => {
              const Wrapper = c.href ? 'a' : 'div';
              const wrapperProps = c.href ? { href: c.href, target: '_blank', rel: 'noopener noreferrer', style: { textDecoration: 'none' } } : {};
              return (
              <Wrapper key={i} {...wrapperProps}>
              <div style={{ display:'flex',alignItems:'center',gap:14,padding:'14px 16px',background:'rgba(255,255,255,0.03)',borderRadius:12,border:'1px solid rgba(255,255,255,0.05)',marginBottom:8,cursor:c.href?'pointer':'default',transition:'background 0.2s' }} onMouseOver={e => c.href && (e.currentTarget.style.background='rgba(255,255,255,0.06)')} onMouseOut={e => c.href && (e.currentTarget.style.background='rgba(255,255,255,0.03)')}>
                <div style={{ width:36,height:36,borderRadius:10,background:`${c.color}20`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                  <span className="material-symbols-outlined" style={{ color:c.color,fontSize:20 }}>{c.icon}</span>
                </div>
                <div>
                  <p style={{ color:'rgba(255,255,255,0.4)',fontSize:11,margin:0,fontWeight:600 }}>{c.label}</p>
                  <p style={{ color:'#fff',fontSize:14,margin:0,fontWeight:600 }}>{c.value}</p>
                </div>
                {c.href && <span className="material-symbols-outlined" style={{ color:'rgba(255,255,255,0.2)',fontSize:16,marginLeft:'auto' }}>open_in_new</span>}
              </div>
              </Wrapper>
            );})}
            <Btn variant="cancel" onClick={close} style={{ width:'100%',marginTop:12 }}>Đóng</Btn>
          </div>
        </Overlay>
      )}

      {/* UPGRADE + MBBANK PAYMENT */}
      {activeModal === 'upgrade' && (
        <Overlay>
          <div style={{ padding:28,textAlign:'center' }}>
            <div style={{ width:56,height:56,borderRadius:16,background:'linear-gradient(135deg,#f59e0b,#f97316)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px' }}>
              <span className="material-symbols-outlined" style={{ color:'#fff',fontSize:28 }}>diamond</span>
            </div>
            <h3 style={{ color:'#fff',fontSize:22,fontWeight:800,margin:'0 0 8px' }}>Nâng cấp PRO</h3>
            <p style={{ color:'rgba(255,255,255,0.5)',fontSize:14,margin:'0 0 20px' }}>Mở khóa tất cả tính năng cao cấp</p>

            {/* Features */}
            <div style={{ display:'flex',flexDirection:'column',gap:6,textAlign:'left',marginBottom:20 }}>
              {['Lưu trữ vĩnh viễn','Ưu tiên xử lý video','Hỗ trợ 24/7','GPT 5.4 không giới hạn','Xuất video 4K'].map((f,i) => (
                <div key={i} style={{ display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:'rgba(245,158,11,0.06)',borderRadius:8 }}>
                  <span className="material-symbols-outlined" style={{ color:'#f59e0b',fontSize:16 }}>check_circle</span>
                  <span style={{ color:'rgba(255,255,255,0.8)',fontSize:13,fontWeight:500 }}>{f}</span>
                </div>
              ))}
            </div>

            {/* Payment Section */}
            <div style={{ background:'rgba(255,255,255,0.03)',borderRadius:12,padding:16,textAlign:'left',marginBottom:16,border:'1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ color:'#f59e0b',fontSize:13,fontWeight:700,marginBottom:12,textAlign:'center' }}>💳 Thanh toán qua VietQR - MBBank</p>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                 <div style={{ background: 'white', padding: 8, borderRadius: 8 }}>
                   <img src={`https://img.vietqr.io/image/mb-04982637281-compact2.png?amount=299000&addInfo=${paymentCode}&accountName=OmniVoicePRO`} alt="VietQR" style={{ width: 140, height: 140, display: 'block' }} />
                 </div>
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12 }}>
                <div>
                  <p style={{ color:'rgba(255,255,255,0.4)',fontSize:11,margin:0 }}>Số tài khoản</p>
                  <p style={{ color:'#fff',fontSize:14,fontWeight:700,margin:0 }}>04982637281</p>
                </div>
                <div>
                  <p style={{ color:'rgba(255,255,255,0.4)',fontSize:11,margin:0 }}>Chủ tài khoản</p>
                  <p style={{ color:'#fff',fontSize:14,fontWeight:700,margin:0 }}>OMNIVOICE PRO</p>
                </div>
                <div>
                  <p style={{ color:'rgba(255,255,255,0.4)',fontSize:11,margin:0 }}>Số tiền</p>
                  <p style={{ color:'#10b981',fontSize:14,fontWeight:700,margin:0 }}>299.000đ</p>
                </div>
                <div>
                  <p style={{ color:'rgba(255,255,255,0.4)',fontSize:11,margin:0 }}>Nội dung CK</p>
                  <p style={{ color:'#f59e0b',fontSize:14,fontWeight:700,margin:0,userSelect:'all',background:'rgba(245,158,11,0.1)',padding:'2px 6px',borderRadius:4,display:'inline-block' }}>{paymentCode}</p>
                </div>
              </div>
              <p style={{ color:'rgba(255,255,255,0.3)',fontSize:11,textAlign:'center' }}>⚠ Vui lòng chuyển đúng nội dung <strong style={{ color:'#f59e0b' }}>{paymentCode}</strong> để tự động nâng cấp.</p>
            </div>

            {/* Check Payment Button */}
            <button onClick={checkPayment} disabled={checkingPayment} style={{ width:'100%',padding:14,borderRadius:12,border:'none',background:paymentResult?.found?'#10b981':'linear-gradient(135deg,#f59e0b,#f97316)',color:'#fff',fontSize:15,fontWeight:800,cursor:'pointer',opacity:checkingPayment?0.6:1,boxShadow:'0 8px 24px rgba(245,158,11,0.3)',marginBottom:8 }}>
              {checkingPayment ? '⏳ Đang kiểm tra giao dịch MBBank...' : paymentResult?.found ? '✅ Đã nâng cấp thành công!' : '🔍 Kiểm tra trạng thái thanh toán'}
            </button>

            {paymentResult && !paymentResult.found && (
              <div style={{ background:'rgba(239,68,68,0.1)',borderRadius:8,padding:10,marginBottom:8 }}>
                <p style={{ color:'#ef4444',fontSize:12,margin:0 }}>❌ Chưa tìm thấy giao dịch. Vui lòng chuyển khoản đúng nội dung rồi nhấn kiểm tra lại.</p>
              </div>
            )}

            <button onClick={close} style={{ width:'100%',padding:12,borderRadius:10,border:'none',background:'transparent',color:'rgba(255,255,255,0.4)',cursor:'pointer',fontSize:13 }}>Để sau</button>
          </div>
        </Overlay>
      )}

      {/* LOGOUT */}
      {activeModal === 'logout' && (
        <Overlay>
          <div style={{ padding:28,textAlign:'center' }}>
            <div style={{ width:56,height:56,borderRadius:16,background:'rgba(255,255,255,0.05)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px' }}>
              <span className="material-symbols-outlined" style={{ color:'#fff',fontSize:28 }}>logout</span>
            </div>
            <h3 style={{ color:'#fff',fontSize:20,fontWeight:700,margin:'0 0 12px' }}>Chắc chắn muốn đăng xuất?</h3>
            <p style={{ color:'rgba(255,255,255,0.5)',fontSize:14,marginBottom:24 }}>Bạn sẽ cần đăng nhập lại để truy cập các dự án.</p>
            <div style={{ display:'flex',gap:12 }}>
              <Btn variant="cancel" onClick={close}>Hủy</Btn>
              <Btn onClick={async () => { setLoggingOut(true); await new Promise(r=>setTimeout(r,800)); localStorage.removeItem('user'); localStorage.removeItem('userRole'); window.location.href = '/dang-nhap'; }} disabled={loggingOut} style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff' }}>
                {loggingOut ? 'Đang thoát...' : 'Đăng xuất'}
              </Btn>
            </div>
          </div>
        </Overlay>
      )}

      {/* DELETE ACCOUNT */}
      {activeModal === 'delete_account' && (
        <Overlay>
          <div style={{ padding:28 }}>
            <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:24 }}>
              <div style={{ width:40,height:40,borderRadius:10,background:'rgba(239,68,68,0.1)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                <span className="material-symbols-outlined text-red-500">warning</span>
              </div>
              <h3 style={{ margin:0,color:'#ef4444',fontSize:18,fontWeight:700 }}>Xóa tài khoản vĩnh viễn</h3>
            </div>
            <div style={{ background:'rgba(239,68,68,0.1)',padding:16,borderRadius:10,border:'1px solid rgba(239,68,68,0.2)',marginBottom:20 }}>
              <p style={{ color:'#ef4444',fontSize:13,margin:0,lineHeight:1.5 }}>
                Tất cả dữ liệu, video dự án, và cấu hình sẽ bị xóa vĩnh viễn khỏi máy chủ. Hành động này không thể hoàn tác.
              </p>
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={{ display:'block',fontSize:13,color:'rgba(255,255,255,0.6)',marginBottom:8 }}>Nhập chữ <strong className="text-red-400">DELETE</strong> để xác nhận:</label>
              <input value={deleteConfText} onChange={e=>setDeleteConfText(e.target.value)} placeholder="DELETE" style={{ width:'100%',padding:'12px 16px',background:'#292934',border:'1px solid rgba(239,68,68,0.3)',borderRadius:10,color:'#fff',fontSize:14,outline:'none',textAlign:'center',letterSpacing:4,fontWeight:700 }} />
            </div>
            <div style={{ display:'flex',gap:12 }}>
              <Btn variant="cancel" onClick={close}>Hủy</Btn>
              <Btn onClick={async () => {
                if(deleteConfText !== 'DELETE') { showToast('Bạn chưa nhập đúng chữ xác nhận.','error'); return; }
                setDeletingAcc(true); await new Promise(r=>setTimeout(r,1500));
                window.location.href = '/login';
              }} disabled={deleteConfText !== 'DELETE' || deletingAcc} variant="danger" style={{ opacity: deleteConfText !== 'DELETE' ? 0.3 : 1 }}>
                {deletingAcc ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
              </Btn>
            </div>
          </div>
        </Overlay>
      )}
    </>
  );
}

function Toast({ toast }) {
  return (
    <div style={{ position:'fixed',top:24,left:'50%',transform:'translateX(-50%)',zIndex:999999,padding:'14px 28px',borderRadius:14,background:toast.type==='error'?'linear-gradient(135deg,#ef4444,#dc2626)':'linear-gradient(135deg,#10b981,#059669)',color:'#fff',fontSize:14,fontWeight:600,boxShadow:'0 8px 32px rgba(0,0,0,0.4)',display:'flex',alignItems:'center',gap:10 }}>
      <span className="material-symbols-outlined" style={{ fontSize:18 }}>{toast.type==='error'?'error':'check_circle'}</span>
      {toast.msg}
    </div>
  );
}
