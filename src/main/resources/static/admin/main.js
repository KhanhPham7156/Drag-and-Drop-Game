document.addEventListener('DOMContentLoaded', async () => {
    // --- AUTH CHECK ---
    try {
        const authRes = await fetch('/api/auth/me');
        const authData = await authRes.json();
        
        if (!authData.user) {
            window.location.href = '/login.html';
            return;
        }

        const usernameEl = document.getElementById('current-username');
        if (usernameEl) {
            usernameEl.innerText = authData.user;
        }
        
        // Show ROOT-only tabs
        if (authData.role === 'ROOT') {
            document.getElementById('nav-users').classList.remove('hidden');
        }
    } catch (e) {
        window.location.href = '/login.html';
        return;
    }

    // --- DOM ELEMENTS ---
    const btnAddLevel = document.getElementById('btn-add-level');
    const btnCancel = document.getElementById('btn-cancel');
    const formSection = document.getElementById('level-form-section');
    const levelForm = document.getElementById('level-form');
    const imageInput = document.getElementById('image-input');
    const imagePreview = document.getElementById('img-preview-tag');
    const previewText = document.querySelector('#image-preview span');
    const levelTableBody = document.getElementById('level-table-body');
    
    // State
    let currentRoomId = null;
    let currentRoomName = '';

    // --- TAB NAVIGATION ---
    const navBtns = document.querySelectorAll('.nav-btn');
    const tabs = document.querySelectorAll('.tab-content');

    navBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            // Active State
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Switch Tab
            const targetId = 'tab-' + btn.dataset.tab;
            tabs.forEach(t => t.classList.add('hidden'));
            document.getElementById(targetId).classList.remove('hidden');

            // Close sidebar on mobile if open
            document.querySelector('.sidebar').classList.remove('active');

            // Load Data if needed
            if (btn.dataset.tab === 'rooms') loadRooms();
            if (btn.dataset.tab === 'users') loadPendingUsers();
        });
    });

    // Mobile Sidebar Toggle
    const menuToggle = document.getElementById('menu-toggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            document.querySelector('.sidebar').classList.toggle('active');
        });
    }

    // Room Create Enter Key
    document.getElementById('new-room-name').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') createRoom();
    });


    // ================= LEVEL LOGIC =================

    async function loadLevels() {
        if (!currentRoomId) {
            levelTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center">Vui lòng chọn hoặc tạo phòng để xem màn chơi.</td></tr>';
            return;
        }

        // Update header
        const header = document.querySelector('#tab-dashboard h1');
        header.innerText = `Quản lý Màn chơi - Phòng: ${currentRoomName}`;

        try {
            const response = await fetch(`/api/management/level?roomId=${currentRoomId}`);
            const levels = await response.json();
            
            levelTableBody.innerHTML = '';
            levels.sort((a, b) => a.levelOrder - b.levelOrder).forEach(level => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${level.levelOrder}</td>
                    <td><img src="${level.imageUrl}" class="img-thumbnail" style="max-height:50px;"></td>
                    <td><strong>${level.answer}</strong></td>
                    <td>${level.hint || ''}</td>
                    <td>${level.timeLimit || 60}s</td>
                    <td class="actions">
                        <div class="actions-wrapper">
                            <!-- TODO: Edit Function could go here -->
                            <button class="btn-delete" onclick="deleteLevel(${level.id})">Xóa</button>
                        </div>
                    </td>
                `;
                levelTableBody.appendChild(tr);
            });
        } catch (error) {
            showToast('Lỗi khi tải danh sách: ' + error.message, 'danger');
        }
    }

    imageInput.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                imagePreview.src = e.target.result;
                imagePreview.classList.remove('hidden');
                previewText.classList.add('hidden');
            }
            reader.readAsDataURL(file);
        }
    });

    levelForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData();
        formData.append('image', imageInput.files[0]);
        formData.append('answer', document.getElementById('answer').value);
        formData.append('hint', document.getElementById('hint').value);
        formData.append('levelOrder', document.getElementById('levelOrder').value);
        formData.append('timeLimit', document.getElementById('timeLimit').value || 60);
        
        if (currentRoomId) {
            formData.append('roomId', currentRoomId);
        } else {
             showToast('Chưa chọn phòng!', 'danger');
             return;
        }

        try {
            const response = await fetch('/api/management/level', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                showToast('Lưu màn chơi thành công!');
                resetForm();
                loadLevels();
            } else {
                throw new Error('Không thể lưu màn chơi');
            }
        } catch (error) {
            showToast(error.message, 'danger');
        }
    });

    // ================= ROOM LOGIC =================
    window.createRoom = async () => {
        const name = document.getElementById('new-room-name').value;
        if (!name) return showToast('Vui lòng nhập tên phòng', 'danger');

        try {
            const res = await fetch(`/api/rooms/create?name=${encodeURIComponent(name)}`, {method:'POST'});
            if(res.ok) {
                const newRoom = await res.json();
                showToast('Tạo phòng thành công');
                document.getElementById('new-room-name').value = '';
                
                // Switch to config
                selectRoom(newRoom.id, newRoom.name);
            } else {
                showToast('Lỗi tạo phòng', 'danger');
            }
        } catch(e) { console.error(e); }
    };

    async function loadRooms() {
        try {
            const res = await fetch('/api/rooms/all');
            const rooms = await res.json();
            const tbody = document.getElementById('room-table-body');
            tbody.innerHTML = '';
            rooms.forEach((r, index) => {
                const tr = document.createElement('tr');
                let statusLabel = r.status || 'WAITING';
                if(statusLabel === 'WAITING') statusLabel = '<span style="color:#ff9800">Đang chờ</span>';
                if(statusLabel === 'PLAYING') statusLabel = '<span style="color:#00e676">Đang chơi</span>';
                if(statusLabel === 'FINISHED') statusLabel = '<span style="color:red">Kết thúc</span>';
                
                let startBtn = '';
                if(r.status === 'WAITING' || !r.status) {
                    startBtn = `<button class="btn-primary" onclick="startRoom(${r.id})" style="padding:5px 10px; font-size:0.8rem; background-color:#10b981;">Bắt đầu</button>`;
                }

                tr.innerHTML = `<td>${index + 1}</td><td>${r.name}</td>
                                <td>${statusLabel}</td>
                                <td>
                                    ${startBtn}
                                    <button class="btn-primary" onclick="openClientsModal(${r.id})" style="padding:5px 10px; font-size:0.8rem; background-color:#3b82f6;">QL Clients</button>
                                    <button class="btn-primary" onclick="selectRoom(${r.id}, '${r.name}')" style="padding:5px 10px; font-size:0.8rem">Cấu hình</button>
                                    <button onclick="deleteRoom(${r.id})" style="padding:5px 10px; font-size:0.8rem; background-color: #ef4444; color: white; border:none; border-radius: 0.5rem; font-weight: 600; cursor: pointer;">Xóa</button>
                                </td>`;
                tbody.appendChild(tr);
            });
        } catch(e) { console.error(e); }
    }


    // ================= USER APPROVAL LOGIC (ROOT) =================
    // ================= USER APPROVAL LOGIC (ROOT) =================
    async function loadPendingUsers() {
        try {
            const res = await fetch('/api/auth/users'); // Now fetches all users
            const users = await res.json();
            const tbody = document.getElementById('user-table-body');
            tbody.innerHTML = '';
            
            if (users.error) return; // Not authorized

            users.forEach((u, index) => {
                const isApproved = u.approved === true; // Note: key might be 'approved' or 'isApproved' depending on JSON serialization. Let's rely on backend DTO or check standard Jackson.
                // Jackson typically serializes boolean isApproved as "approved" unless configured otherwise, or "isApproved" if field name.
                // Looking at User.java: private Boolean isApproved; Getter: isApproved(). 
                // Jackson default for Boolean object getter 'isApproved()' -> 'approved'.
                // Jackson default for boolean primitive getter 'isApproved()' -> 'approved'.
                // BUT if field is 'isApproved', sometimes it's mapped as 'isApproved'. 
                // Let's check the previous `loadPendingUsers` code used `u.username`... 
                // We will handle strictly.
                
                const approved = u.approved || u.isApproved; 
                
                const tr = document.createElement('tr');
                let actions = '';
                let statusBadge = '';
                
                if (!approved) {
                    statusBadge = '<span style="color:#ff9800">Pending</span>';
                    actions = `<button class="btn-primary" onclick="approveUser(${u.id})">Duyệt</button>
                               <button class="btn-delete" onclick="deleteUser(${u.id})">Xóa</button>`;
                } else {
                     statusBadge = '<span style="color:#00e676">Approved</span>';
                     actions = `<button class="btn-delete" onclick="deleteUser(${u.id})">Xóa</button>`;
                }

                tr.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${u.username}</td>
                    <td>${statusBadge}</td>
                    <td>${actions}</td>
                `;
                tbody.appendChild(tr);
            });
        } catch (e) { console.error(e); }
    }

    window.approveUser = async (id) => {
        if(!confirm('Duyệt người dùng này?')) return;
        try {
            const res = await fetch(`/api/auth/approve/${id}`, {method:'POST'});
            if (res.ok) {
                showToast('Đã duyệt!');
                loadPendingUsers();
            }
        } catch(e) { console.error(e); }
    }

    window.deleteUser = async (id) => {
        if(!confirm('Xóa người dùng này?')) return;
        try {
            const res = await fetch(`/api/auth/user/${id}`, {method:'DELETE'});
            if (res.ok) {
                showToast('Đã xóa!');
                loadPendingUsers();
            }
        } catch(e) { console.error(e); }
    }


    // ================= CLIENT MANAGEMENT LOGIC =================
    let viewingRoomId = null;

    window.openClientsModal = (roomId) => {
        viewingRoomId = roomId;
        document.getElementById('clients-modal').style.display = 'flex';
        document.querySelector('#clients-modal').classList.remove('hidden');
        refreshClients();
    };

    window.closeClientsModal = () => {
        viewingRoomId = null;
        document.getElementById('clients-modal').style.display = 'none';
        document.querySelector('#clients-modal').classList.add('hidden');
    };

    window.refreshClients = async () => {
        if (!viewingRoomId) return;
        try {
            const res = await fetch(`/api/rooms/${viewingRoomId}/players`);
            const players = await res.json();
            
            // Sort by Score Desc
            players.sort((a, b) => b.score - a.score);

            const tbody = document.getElementById('clients-table-body');
            tbody.innerHTML = '';
            
            players.forEach((p, idx) => {
                const tr = document.createElement('tr');
                tr.style.backgroundColor = "white"; // Matches screenshot
                tr.style.color = "#1e293b"; // Dark text
                tr.style.borderBottom = "1px solid #e2e8f0";

                const status = p.finished ? '<span style="color:#10b981; font-weight:600;">Đã xong</span>' : '<span style="color:#f59e0b; font-weight:600;">Đang chơi</span>';
                
                tr.innerHTML = `
                    <td style="padding:10px;">${idx + 1}</td>
                    <td style="padding:10px; font-weight:500;">${p.name || 'Unknown'}</td>
                    <td style="padding:10px; font-weight:700; color:#eab308;">${p.score}</td>
                    <td style="padding:10px;">${status}</td>
                `;
                tbody.appendChild(tr);
            });
        } catch(e) { console.error(e); }
    };
    
    // Auto refresh clients if modal is open (optional)
    setInterval(() => {
        if (!document.getElementById('clients-modal').classList.contains('hidden')) {
            refreshClients();
        }
    }, 500);


    // ================= SHARED UTILS =================
    window.deleteLevel = async (id) => {
        if (!confirm('Bạn có chắc chắn muốn xóa màn này?')) return;
        try {
            const response = await fetch(`/api/management/level/${id}`, { method: 'DELETE' });
            if (response.ok) {
                showToast('Đã xóa màn chơi');
                loadLevels();
            }
        } catch (error) {
            showToast('Lỗi khi xóa: ' + error.message, 'danger');
        }
    };

    window.startRoom = async (id) => {
        if(!confirm('Bắt đầu trò chơi cho phòng này?')) return;
        try {
            const res = await fetch(`/api/rooms/${id}/start`, {method:'POST'});
            if(res.ok) {
                showToast('Đã bắt đầu trò chơi!');
                loadRooms();
            }
        } catch(e) { console.error(e); }
    };
    
    window.deleteRoom = async (id) => {
        if (!confirm('Xóa phòng này?')) return;
        try {
            const response = await fetch(`/api/rooms/${id}`, { method: 'DELETE' });
            if (response.ok) {
                showToast('Đã xóa phòng');
                loadRooms();
            }
        } catch (error) {
            showToast('Lỗi khi xóa phòng', 'danger');
        }
    };
    
    window.selectRoom = (id, name) => {
        currentRoomId = id;
        currentRoomName = name;
        
        // Find dashboard tab button and click it to switch view. Note: The button is hidden but clickable.
        document.querySelector('[data-tab="dashboard"]').click();
        
        // Trigger load
        loadLevels();
    };

    window.backToRooms = () => {
        currentRoomId = null;
        currentRoomName = '';
        document.querySelector('[data-tab="rooms"]').click();
        loadRooms();
    };

    function resetForm() {
        levelForm.reset();
        imagePreview.classList.add('hidden');
        previewText.classList.remove('hidden');
        formSection.classList.add('hidden');
    }

    function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerText = message;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
    
    window.handleLogout = async () => {
         await fetch('/api/auth/logout', {method:'POST'});
         window.location.href = '/login.html';
    };

    btnAddLevel.addEventListener('click', () => formSection.classList.remove('hidden'));
    btnCancel.addEventListener('click', resetForm);

    // Initial Load
    // Initial Load - Default is Rooms now
    loadRooms();
});
