document.addEventListener('DOMContentLoaded', async () => {
    // --- AUTH CHECK ---
    try {
        const authRes = await fetch('/api/auth/me');
        const authData = await authRes.json();
        
        if (!authData.user) {
            window.location.href = '/login.html';
            return;
        }

        document.getElementById('current-username').innerText = authData.user;
        
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

            // Load Data if needed
            if (btn.dataset.tab === 'rooms') loadRooms();
            if (btn.dataset.tab === 'users') loadPendingUsers();
        });
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
                    <td><img src="${level.imageUrl}" class="img-thumbnail"></td>
                    <td><strong>${level.answer}</strong></td>
                    <td>${level.hint || ''}</td>
                    <td class="actions">
                        <div class="actions-wrapper">
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
            rooms.forEach(r => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${r.id}</td><td>${r.name}</td>
                                <td><span style="color:${r.active?'#00e676':'red'}">${r.active?'Active':'Inactive'}</span></td>
                                <td>
                                    <button class="btn-primary" onclick="selectRoom(${r.id}, '${r.name}')" style="padding:5px 10px; font-size:0.8rem">Cấu hình</button>
                                    <button class="btn-delete" onclick="deleteRoom(${r.id})">Xóa</button>
                                </td>`;
                tbody.appendChild(tr);
            });
        } catch(e) { console.error(e); }
    }


    // ================= USER APPROVAL LOGIC (ROOT) =================
    async function loadPendingUsers() {
        try {
            const res = await fetch('/api/auth/pending');
            const users = await res.json();
            const tbody = document.getElementById('user-table-body');
            tbody.innerHTML = '';
            
            if (users.error) return; // Not authorized

            users.forEach(u => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${u.id}</td>
                    <td>${u.username}</td>
                    <td><span style="color:#ff9800">Pending</span></td>
                    <td><button class="btn-primary" onclick="approveUser(${u.id})">Duyệt</button></td>
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
