var cacheName = 'one-to-hundred-v1';

var filesToCache = [
    'one-to-hundred.js',
    'one-to-hundred.css',
    'index.html'
];


self.addEventListener('install', function (event) {
    console.log('install');

    event.waitUntil(
        caches.open(cacheName)
            .then(function (cache) {
                console.log('about to cache');
                return cache.addAll(filesToCache);
            })
            .then(function () {
                console.log('cached');
            }, function (reason) {
                console.warn('caching failed', reason);
            })
    );
});

self.addEventListener('fetch', function (event) {
    event.respondWith(
        caches.match(event.request)
            .then(function (response) {
                if (response) {
                    console.log('cache hit', event.request.url);
                    return response;
                }

                console.log('cache miss', event.request.url);
                return fetch(event.request);
            })
    );
});
