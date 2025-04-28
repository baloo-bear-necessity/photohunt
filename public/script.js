async function saveName() {
  const name = document.getElementById('nameInput').value;
  document.cookie = `name=${name}; path=/`;
  location.reload();
}

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
}

async function loadQuestions() {
  const res = await fetch('/questions');
  const data = await res.json();
  const uploads = await (await fetch('/uploads')).json();

  const username = getCookie('name');
  const container = document.getElementById('questions');
  container.innerHTML = '';

  data.questions.forEach(q => {
    const div = document.createElement('div');
    div.innerHTML = `
      <p>${q}</p>
      <input type="file" id="file-${q}" accept="image/*">
      <button onclick="uploadPhoto('${q}')">Upload</button>
      <div id="thumb-${q}"></div>
    `;
    container.appendChild(div);

    const filePattern = `${username}_${q.replace(/\s+/g, '_')}`;
    const match = uploads.blobs.find(b => b.includes(filePattern));
    if (match) {
      const thumbDiv = document.getElementById(`thumb-${q}`);
      thumbDiv.innerHTML = `
        <img src="https://YOUR_STORAGE_ACCOUNT_NAME.blob.core.windows.net/uploads/${match}" width="100">
        <button onclick="deletePhoto('${match}')">Delete</button>
      `;
    }
  });
}

async function uploadPhoto(question) {
  const fileInput = document.getElementById(`file-${question}`);
  const formData = new FormData();
  formData.append('photo', fileInput.files[0]);
  formData.append('question', question);

  await fetch('/upload', { method: 'POST', body: formData });
  location.reload();
}

async function deletePhoto(blobName) {
  await fetch('/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blobName })
  });
  location.reload();
}

const name = getCookie('name');
if (!name) {
  document.getElementById('emailPrompt').style.display = 'block';
} else {
  document.getElementById('mainContent').style.display = 'block';
  loadQuestions();
}
