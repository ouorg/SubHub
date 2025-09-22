import type { UserRecord } from "./storage";

const escapeHtml = (value: string): string =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const layout = (title: string, body: string, script = ""): string => `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css"
    />
  </head>
  <body class="min-h-screen bg-slate-950 text-slate-100">
    <div class="max-w-4xl mx-auto px-4 py-12">
      ${body}
    </div>
    ${script}
  </body>
</html>`;

export const renderLoginPage = (): string => {
  const body = `
    <div class="text-center mb-12">
      <h1 class="text-4xl font-semibold">SubHub</h1>
      <p class="text-slate-300 mt-2">简洁的机场订阅管理面板</p>
    </div>
    <form id="login-form" class="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-4">
      <div>
        <label for="credential" class="block text-sm font-medium text-slate-300">UUID 或管理员口令</label>
        <input
          id="credential"
          name="credential"
          type="text"
          required
          class="mt-2 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 focus:border-indigo-400 focus:outline-none"
          placeholder="输入你的订阅 UUID 或管理员口令"
        />
      </div>
      <button
        type="submit"
        class="w-full rounded-md bg-indigo-500 px-4 py-2 font-semibold text-white hover:bg-indigo-400 focus:outline-none"
      >登录</button>
      <p id="message" class="text-sm text-rose-400"></p>
    </form>
  `;
  const script = `
    <script>
      const form = document.getElementById('login-form');
      const message = document.getElementById('message');
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        message.textContent = '';
        const credential = (document.getElementById('credential')).value.trim();
        if (!credential) {
          message.textContent = '请输入凭据';
          return;
        }
        try {
          const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential })
          });
          const result = await response.json();
          if (!response.ok) {
            throw new Error(result.error || '登录失败');
          }
          if (result.role === 'admin') {
            window.location.href = '/admin';
          } else {
            window.location.href = '/user';
          }
        } catch (error) {
          message.textContent = error.message;
        }
      });
    </script>
  `;
  return layout("SubHub 登录", body, script);
};

export const renderUserPage = (uuid: string, record: UserRecord): string => {
  const initial = escapeHtml(JSON.stringify({ uuid, record }));
  const body = `
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-semibold">欢迎回来</h1>
        <p class="text-slate-400">订阅 UUID：<span class="font-mono text-indigo-300">${escapeHtml(uuid)}</span></p>
      </div>
      <a href="/logout" class="text-sm text-slate-400 hover:text-white">退出登录</a>
    </div>
    <div class="mt-8 grid gap-6 md:grid-cols-2">
      <div class="rounded-lg border border-slate-800 bg-slate-900 p-6 space-y-4">
        <div>
          <h2 class="text-sm uppercase tracking-widest text-slate-400">订阅链接</h2>
          <p class="break-all text-slate-100" id="sub-link"></p>
        </div>
        <div>
          <h2 class="text-sm uppercase tracking-widest text-slate-400">有效期</h2>
          <p class="text-slate-100" id="expire"></p>
        </div>
        <div>
          <h2 class="text-sm uppercase tracking-widest text-slate-400">备注</h2>
          <p class="text-slate-100" id="note"></p>
        </div>
      </div>
      <div class="rounded-lg border border-slate-800 bg-slate-900 p-6 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-sm uppercase tracking-widest text-slate-400">用量</h2>
          <button id="refresh" class="rounded-md bg-indigo-500 px-3 py-1 text-sm font-semibold text-white hover:bg-indigo-400">刷新</button>
        </div>
        <div class="space-y-2 text-slate-100">
          <p>上传：<span id="upload" class="font-mono"></span></p>
          <p>下载：<span id="download" class="font-mono"></span></p>
          <p>总量：<span id="total" class="font-mono"></span></p>
        </div>
        <p id="status" class="text-sm text-slate-400"></p>
      </div>
    </div>
  `;
  const script = `
    <script>
      const initial = JSON.parse('${initial}');
      const formatBytes = (bytes) => {
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let value = bytes;
        let unit = 0;
        while (value >= 1024 && unit < units.length - 1) {
          value /= 1024;
          unit++;
        }
        return value.toFixed(2) + ' ' + units[unit];
      };
      const formatDate = (value) => {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return date.toLocaleString();
      };
      const render = (data) => {
        document.getElementById('sub-link').textContent = data.record.sub;
        document.getElementById('expire').textContent = formatDate(data.record.expire);
        document.getElementById('note').textContent = data.record.note || '-';
        document.getElementById('upload').textContent = formatBytes(data.record.traffic.upload || 0);
        document.getElementById('download').textContent = formatBytes(data.record.traffic.download || 0);
        document.getElementById('total').textContent = formatBytes(data.record.traffic.total || 0);
      };
      render(initial);
      const status = document.getElementById('status');
      document.getElementById('refresh').addEventListener('click', async () => {
        status.textContent = '正在刷新…';
        try {
          const response = await fetch('/refresh/' + initial.uuid, { method: 'POST' });
          const result = await response.json();
          if (!response.ok) {
            throw new Error(result.error || '刷新失败');
          }
          render({ uuid: initial.uuid, record: result.record });
          status.textContent = '已更新';
        } catch (error) {
          status.textContent = error.message;
        }
      });
    </script>
  `;
  return layout("SubHub 用户面板", body, script);
};

export const renderAdminPage = (): string => {
  const body = `
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-semibold">管理后台</h1>
        <p class="text-slate-400">管理订阅用户数据</p>
      </div>
      <a href="/logout" class="text-sm text-slate-400 hover:text-white">退出登录</a>
    </div>
    <div class="mt-8 grid gap-6 lg:grid-cols-3">
      <form id="user-form" class="lg:col-span-1 space-y-4 rounded-lg border border-slate-800 bg-slate-900 p-6">
        <h2 class="text-lg font-semibold">用户信息</h2>
        <p id="form-status" class="text-sm text-slate-400"></p>
        <div class="space-y-2">
          <label class="block text-sm">UUID
            <input type="text" id="uuid" required class="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 focus:border-indigo-400 focus:outline-none" />
          </label>
          <label class="block text-sm">订阅链接
            <input type="url" id="sub" required class="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 focus:border-indigo-400 focus:outline-none" />
          </label>
          <label class="block text-sm">到期时间 (ISO8601)
            <input type="text" id="expire" required class="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 focus:border-indigo-400 focus:outline-none" placeholder="2025-12-31T23:59:59Z" />
          </label>
          <label class="block text-sm">备注
            <input type="text" id="note" class="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 focus:border-indigo-400 focus:outline-none" />
          </label>
          <div class="grid grid-cols-3 gap-2">
            <label class="block text-sm">上传
              <input type="number" id="upload" class="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2" />
            </label>
            <label class="block text-sm">下载
              <input type="number" id="download" class="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2" />
            </label>
            <label class="block text-sm">总量
              <input type="number" id="total" class="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2" />
            </label>
          </div>
        </div>
        <div class="flex gap-3">
          <button type="submit" class="flex-1 rounded-md bg-indigo-500 px-4 py-2 font-semibold text-white hover:bg-indigo-400" id="submit">
            保存
          </button>
          <button type="button" id="reset" class="rounded-md border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800">
            重置
          </button>
        </div>
      </form>
      <div class="lg:col-span-2 rounded-lg border border-slate-800 bg-slate-900 p-6">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">用户列表</h2>
          <button id="reload" class="rounded-md border border-slate-600 px-3 py-1 text-sm text-slate-200 hover:bg-slate-800">刷新</button>
        </div>
        <p id="list-status" class="text-sm text-slate-400"></p>
        <div class="mt-4 overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-800 text-left text-sm">
            <thead class="bg-slate-800">
              <tr>
                <th class="px-3 py-2">UUID</th>
                <th class="px-3 py-2">订阅</th>
                <th class="px-3 py-2">到期</th>
                <th class="px-3 py-2">备注</th>
                <th class="px-3 py-2">操作</th>
              </tr>
            </thead>
            <tbody id="users" class="divide-y divide-slate-800"></tbody>
          </table>
        </div>
      </div>
    </div>
  `;
  const script = `
    <script>
      let editingUuid = null;
      const form = document.getElementById('user-form');
      const formStatus = document.getElementById('form-status');
      const listStatus = document.getElementById('list-status');
      const usersBody = document.getElementById('users');
      const fields = ['uuid', 'sub', 'expire', 'note', 'upload', 'download', 'total'];
      const getFormData = () => {
        const data = {};
        fields.forEach((field) => {
          const value = document.getElementById(field).value;
          if (field === 'upload' || field === 'download' || field === 'total') {
            data[field] = value ? Number(value) : 0;
          } else {
            data[field] = value.trim();
          }
        });
        return data;
      };
      const setFormData = (record) => {
        document.getElementById('uuid').value = record.uuid || '';
        document.getElementById('sub').value = record.record?.sub || '';
        document.getElementById('expire').value = record.record?.expire || '';
        document.getElementById('note').value = record.record?.note || '';
        document.getElementById('upload').value = record.record?.traffic?.upload ?? '';
        document.getElementById('download').value = record.record?.traffic?.download ?? '';
        document.getElementById('total').value = record.record?.traffic?.total ?? '';
      };
      const resetForm = () => {
        editingUuid = null;
        formStatus.textContent = '';
        setFormData({ uuid: '', record: { sub: '', expire: '', note: '', traffic: {} } });
      };
      const loadUsers = async () => {
        listStatus.textContent = '加载中…';
        try {
          const response = await fetch('/admin/users');
          const result = await response.json();
          if (!response.ok) {
            throw new Error(result.error || '加载失败');
          }
          usersBody.innerHTML = '';
          result.users.forEach((item) => {
            const row = document.createElement('tr');
            row.innerHTML = ` + "`" + `<td class=\"px-3 py-2 font-mono text-xs\">${'${'}item.uuid}</td>
              <td class=\"px-3 py-2 break-all\">${'${'}item.record.sub}</td>
              <td class=\"px-3 py-2\">${'${'}new Date(item.record.expire).toLocaleString()}</td>
              <td class=\"px-3 py-2\">${'${'}item.record.note || '-'}</td>
              <td class=\"px-3 py-2 space-x-2\">
                <button class=\"edit text-indigo-400\" data-uuid=${'"${'}item.uuid{'"}'}>编辑</button>
                <button class=\"delete text-rose-400\" data-uuid=${'"${'}item.uuid{'"}'}>删除</button>
              </td>` + "`" + `;
            usersBody.appendChild(row);
          });
          listStatus.textContent = '';
        } catch (error) {
          listStatus.textContent = error.message;
        }
      };
      usersBody.addEventListener('click', async (event) => {
        if (event.target.matches('button.edit')) {
          const uuid = event.target.getAttribute('data-uuid');
          const response = await fetch('/admin/users');
          const result = await response.json();
          const user = result.users.find((item) => item.uuid === uuid);
          if (user) {
            editingUuid = uuid;
            setFormData(user);
            formStatus.textContent = '编辑模式：' + uuid;
          }
        }
        if (event.target.matches('button.delete')) {
          const uuid = event.target.getAttribute('data-uuid');
          if (!confirm('确认删除 ' + uuid + ' ?')) return;
          try {
            const response = await fetch('/admin/users/' + uuid, { method: 'DELETE' });
            if (!response.ok) {
              const result = await response.json();
              throw new Error(result.error || '删除失败');
            }
            await loadUsers();
          } catch (error) {
            alert(error.message);
          }
        }
      });
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        formStatus.textContent = '';
        const data = getFormData();
        const payload = {
          sub: data.sub,
          expire: data.expire,
          note: data.note,
          traffic: {
            upload: data.upload,
            download: data.download,
            total: data.total,
          },
        };
        try {
          let response;
          if (editingUuid) {
            response = await fetch('/admin/users/' + editingUuid, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
          } else {
            if (!data.uuid) {
              throw new Error('UUID 不能为空');
            }
            response = await fetch('/admin/users', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ uuid: data.uuid, record: payload }),
            });
          }
          const result = await response.json();
          if (!response.ok) {
            throw new Error(result.error || '保存失败');
          }
          formStatus.textContent = '保存成功';
          editingUuid = null;
          await loadUsers();
        } catch (error) {
          formStatus.textContent = error.message;
        }
      });
      document.getElementById('reset').addEventListener('click', () => {
        editingUuid = null;
        form.reset();
        formStatus.textContent = '';
      });
      document.getElementById('reload').addEventListener('click', loadUsers);
      loadUsers();
    </script>
  `;
  return layout("SubHub 管理后台", body, script);
};
