let cloudName = 'dobhhnwmo';
let uploadPreset = 'admin-upload-RKngG48HayjrVf332wfT';

export let uploadFileToCloudinary = async () => {
  let fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*,video/*';

  let file = await new Promise<File>((resolve, reject) => {
    fileInput.onchange = (e: Event) => {
      let target = e.target as HTMLInputElement;
      let selectedFile = target.files?.[0];

      if (selectedFile) {
        resolve(selectedFile);
      } else {
        reject(new Error('No file selected'));
      }
    };

    fileInput.oncancel = () => {
      reject(new Error('File selection cancelled'));
    };

    fileInput.click();
  });

  let formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);

  let response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    let error = await response.json();
    throw new Error(`Upload failed: ${error.error?.message || 'Unknown error'}`);
  }

  let result = await response.json();
  return result as { secure_url: string };
};
