document.addEventListener('DOMContentLoaded', () => {
    const btnAddLevel = document.getElementById('btn-add-level');
    const btnCancel = document.getElementById('btn-cancel');
    const formSection = document.getElementById('level-form-section');
    const levelForm = document.getElementById('level-form');
    const imageInput = document.getElementById('image-input');
    const imagePreview = document.getElementById('img-preview-tag');
    const previewText = document.querySelector('#image-preview span');
    const levelTableBody = document.getElementById('level-table-body');

    // 1. Tải danh sách màn chơi
    async function loadLevels() {
        try {
            const response = await fetch('/api/management/level');
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

    // 2. Xử lý xem trước ảnh
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

    // 3. Xử lý gửi Form (Thêm mới)
    levelForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData();
        formData.append('image', imageInput.files[0]);
        formData.append('answer', document.getElementById('answer').value);
        formData.append('hint', document.getElementById('hint').value);
        formData.append('levelOrder', document.getElementById('levelOrder').value);

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

    // 4. Xóa màn chơi (Gán vào window để gọi từ HTML)
    window.deleteLevel = async (id) => {
        if (!confirm('Bạn có chắc chắn muốn xóa màn này?')) return;

        try {
            const response = await fetch(`/api/management/level/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                showToast('Đã xóa màn chơi');
                loadLevels();
            }
        } catch (error) {
            showToast('Lỗi khi xóa: ' + error.message, 'danger');
        }
    };

    // Utils
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

    btnAddLevel.addEventListener('click', () => formSection.classList.remove('hidden'));
    btnCancel.addEventListener('click', resetForm);

    // Bắt đầu tải dữ liệu
    loadLevels();
});
