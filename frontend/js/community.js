function apiBase() { return (typeof API_BASE !== 'undefined' && API_BASE) ? API_BASE : 'http://localhost:5000'; }

async function loadCommunity() {
    const list = document.getElementById('communityList');
    if (!list) return;
    try {
        const res = await fetch(`${apiBase()}/campus/social-feed`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await res.json();
        const items = data?.items || [];
        list.innerHTML = items.map(p => `
            <div class="bg-white p-5 rounded-lg shadow-sm border border-gray-100">
                <div class="flex items-center justify-between gap-2 mb-3">
                    <div class="flex items-center gap-2 min-w-0">
                        <img src="assets/avatar.svg" alt="" class="w-8 h-8 rounded-full shrink-0">
                        <div class="min-w-0">
                            <p class="text-sm font-bold text-gray-800 truncate">${p.display_name || (p.author_role === 'student' ? 'Student' : p.author_role === 'admin' ? 'Admin' : 'Faculty Member')}</p>
                            <p class="text-[9px] font-black uppercase text-gray-400">${p.author_role || 'member'}</p>
                        </div>
                    </div>
                    <p class="text-[10px] text-gray-400 shrink-0">${new Date(p.created_at).toLocaleString()}</p>
                </div>
                <p class="text-sm text-gray-600 break-words">${p.content || ''}</p>
                ${p.media_url ? `<img src="${p.media_url}" class="mt-3 rounded-lg w-full h-40 object-cover border" onerror="this.style.display='none'">` : ''}
            </div>
        `).join('') || '<div class="bg-white p-8 rounded-lg text-center text-sm text-gray-400">No posts yet. Start the conversation!</div>';
        const meta = document.getElementById('communityMeta');
        if (meta) meta.textContent = `${items.length} post${items.length === 1 ? '' : 's'} in the community`;
    } catch (err) { console.error(err); }
}

async function postCommunity() {
    const input = document.getElementById('communityBody');
    if (!input) return;
    const content = input.value.trim();
    if (!content) {
        if (typeof showToast === 'function') showToast('Write something to post.', 'error');
        return;
    }
    const btn = document.getElementById('communityPostBtn');
    if (btn) btn.disabled = true;
    try {
        const res = await fetch(`${apiBase()}/campus/social-feed`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
        });
        const data = await res.json();
        if (res.ok) {
            input.value = '';
            if (typeof showToast === 'function') showToast('Posted to the community!', 'success');
            loadCommunity();
        } else {
            if (typeof showToast === 'function') showToast(data?.message || 'Post failed.', 'error');
        }
    } catch (err) { console.error(err); }
    if (btn) btn.disabled = false;
}

function bindCommunity() {
    const postBtn = document.getElementById('communityPostBtn');
    const body = document.getElementById('communityBody');
    if (postBtn && !postBtn.dataset.bound) {
        postBtn.addEventListener('click', postCommunity);
        postBtn.dataset.bound = '1';
    }
    if (body && !body.dataset.bound) {
        body.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); postCommunity(); }
        });
        body.dataset.bound = '1';
    }
}

function showCommunitySection() {
    bindCommunity();
    loadCommunity();
}

document.addEventListener('DOMContentLoaded', bindCommunity);