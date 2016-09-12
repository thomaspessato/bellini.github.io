const currentCacheName = 'static-v2';
const urlsToCache = [
  'https://fonts.googleapis.com/icon?family=Material+Icons',
  'https://fonts.gstatic.com/s/materialicons/v17/2fcrYFNaTjcS6g4U3t-Y5UEw0lE80llgEseQY3FEmqw.woff2',
  '../css/material.min.css',
  '../css/style.css',
  'material.min.js',
  'nunjucks.min.js',
  'jspdf.min.js',
  'jspdf.plugin.autotable.src.js',
  'main.js',
  '../template/info.html',
  '../template/question.html',
  '../template/section.html',
  '../index.html'
];

self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(currentCacheName).then(function(cache) {
            return cache.addAll(urlsToCache);
        })
    );
});

self.addEventListener('fetch', function(event) {
	var requestUrl = new URL(event.request.url);

	if (requestUrl.origin === location.origin) {
		if (requestUrl.pathname === '/') {
			event.respondWith(caches.match('../index.html'));
			return;
		}
	}
	event.respondWith(
		caches.match(event.request)
			.then(function(cacheResponse) {
				if(cacheResponse){
					//console.log('SW Cache -> get request:', cacheResponse.url);
					return cacheResponse;
				}

				var fetchRequest = event.request;
				return fetch(fetchRequest).then(function(response){
					if(response && response.status === 200){
						caches.open(currentCacheName).then(function(cache) {
							//console.log('SW Cache -> put request:', response.url);
							cache.put(event.request, response);
						});
					}

					return response.clone();
				});
			})
			.catch(function(){

			})
	);
});

self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(cacheName) {
                    if (currentCacheName.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
