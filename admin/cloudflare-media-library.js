const DIRECT_UPLOAD_FUNCTION = '/.netlify/functions/cloudflare-create-direct-upload';

function createCloudflareLibrary() {
	let libraryConfig = {
		accountHash: '7-GLn6-56OyK7JwwGe0hfg',
		defaultVariant: 'public',
		functionPath: DIRECT_UPLOAD_FUNCTION
	};

	return {
		name: 'cloudflare',

		init({ config }) {
			let mediaConfig;
			if (typeof config.getIn === 'function') {
				mediaConfig = config.getIn(['media_library', 'config']);
			} else {
				const mediaLibrary = config.get?.('media_library');
				mediaConfig = mediaLibrary?.get?.('config');
			}

			libraryConfig = {
				accountHash: mediaConfig?.get?.('account_hash') || libraryConfig.accountHash,
				defaultVariant: mediaConfig?.get?.('default_variant') || libraryConfig.defaultVariant,
				functionPath: mediaConfig?.get?.('function_path') || libraryConfig.functionPath
			};

			return libraryConfig;
		},

		async open({ handleInsert, config }) {
			const input = document.createElement('input');
			input.type = 'file';
			input.accept = 'image/*';

			input.addEventListener('change', async () => {
				const file = input.files[0];
				if (!file) {
					return;
				}

				try {
					const directUploadRes = await fetch(config.functionPath || DIRECT_UPLOAD_FUNCTION, {
						method: 'POST'
					});

					if (!directUploadRes.ok) {
						const message = await directUploadRes.text();
						throw new Error(message || 'Failed to create Cloudflare upload URL');
					}

					const { id, uploadURL } = await directUploadRes.json();

					const formData = new FormData();
					formData.append('file', file);

					const uploadRes = await fetch(uploadURL, {
						method: 'POST',
						body: formData
					});

					if (!uploadRes.ok) {
						const message = await uploadRes.text();
						throw new Error(message || 'Failed to upload image to Cloudflare');
					}

					handleInsert(`${id}`);

					// Give Decap a moment to populate the field before cleaning up the input element
					setTimeout(() => input.remove(), 0);

					// Notify the editor visually using the built-in notification system if available
					if (window.CMS?.alerts?.notifySuccess) {
						window.CMS.alerts.notifySuccess('Cloudflare image uploaded');
					}
				} catch (error) {
					console.error(error);
					if (window.CMS?.alerts?.notifyError) {
						window.CMS.alerts.notifyError(error.message);
					} else {
						alert(error.message);
					}
				}
			});

			input.click();
		},

		displayURL(value) {
			const imageId = typeof value === 'string' ? value : value?.id;
			if (!imageId) {
				return '';
			}

			const variant = libraryConfig.defaultVariant || 'public';
			return `https://imagedelivery.net/${libraryConfig.accountHash}/${imageId}/${variant}`;
		},

		persist(value) {
			return Promise.resolve(value);
		},

		delete() {
			return Promise.resolve();
		}
	};
}

const register = () => {
	const library = createCloudflareLibrary();
	window.CMS.registerMediaLibrary(library);
};

const boot = () => {
	if (window.CMS) {
		register();
	} else {
		setTimeout(boot, 50);
	}
};

boot();
