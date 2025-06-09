/**
 * Location Service for Nestlé Chatbot
 * Handles geolocation detection, store finding, and location-based features
 * 
 * Features:
 * - Browser geolocation API integration
 * - Mock store data with distance calculations
 * - Location permission management
 * - Visual status indicators
 * 
 * Author: Paramvir (Vick) Gill
 */

class LocationService {
    constructor() {
        this.userLocation = null;
        this.locationEnabled = false;
        this.locationPermission = 'unknown'; // 'granted', 'denied', 'prompt', 'unknown'
        this.stores = this.loadMockStores();
        this.callbacks = {
            onLocationUpdate: [],
            onPermissionChange: []
        };
        
        this.initializeLocationService();
    }

    /**
     * Initialize location service and check existing permissions
     */
    async initializeLocationService() {
        try {
            // Check if geolocation is supported
            if (!navigator.geolocation) {
                console.warn('Geolocation is not supported by this browser');
                return;
            }

            // Check existing permission status
            if (navigator.permissions) {
                const permission = await navigator.permissions.query({ name: 'geolocation' });
                this.locationPermission = permission.state;
                
                // Listen for permission changes
                permission.addEventListener('change', () => {
                    this.locationPermission = permission.state;
                    this.notifyPermissionChange();
                });
            }

            console.log('Location service initialized');
        } catch (error) {
            console.error('Error initializing location service:', error);
        }
    }

    /**
     * Request user permission for location access
     */
    async requestLocationPermission() {
        console.log('requestLocationPermission called');
        console.log('Current protocol:', location.protocol);
        console.log('Current hostname:', location.hostname);
        
        // HTTPS fallback for local development
        if (location.protocol === 'http:') {
            console.log('Using simulated location path');
            const useSimulated = confirm(
                "⚠️ Location services require HTTPS.\n\n" +
                "For testing, would you like to use simulated location data?\n" +
                "(This will use Mississauga, ON as your location)\n\n" +
                "Click OK to test with simulated location."
            );
            
            if (useSimulated) {
                console.log('User approved simulated location');
                // Simulate user location in Mississauga, ON
                this.userLocation = {
                    latitude: 43.5890,
                    longitude: -79.6441,
                    accuracy: 100,
                    timestamp: new Date()
                };
                
                this.locationEnabled = true;
                this.locationPermission = 'granted';
                
                console.log('Simulated location enabled:', this.userLocation);
                this.notifyLocationUpdate();
                this.notifyPermissionChange();
                
                return this.userLocation;
            } else {
                console.log('User denied simulated location');
                this.locationPermission = 'denied';
                this.notifyPermissionChange();
                throw new Error('Location access denied by user');
            }
        }
        
        console.log('Using real geolocation path');
        // Original geolocation code for HTTPS environments
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }
    
            const options = {
                enableHighAccuracy: false,
                timeout: 10000,
                maximumAge: 300000 // 5 minutes
            };
    
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.userLocation = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        timestamp: new Date(position.timestamp)
                    };
                    
                    this.locationEnabled = true;
                    this.locationPermission = 'granted';
                    
                    console.log('Real location obtained:', this.userLocation);
                    this.notifyLocationUpdate();
                    this.notifyPermissionChange();
                    
                    resolve(this.userLocation);
                },
                (error) => {
                    this.locationEnabled = false;
                    
                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            this.locationPermission = 'denied';
                            reject(new Error('Location access denied by user'));
                            break;
                        case error.POSITION_UNAVAILABLE:
                            reject(new Error('Location information unavailable'));
                            break;
                        case error.TIMEOUT:
                            reject(new Error('Location request timed out'));
                            break;
                        default:
                            reject(new Error('Unknown location error'));
                            break;
                    }
                    
                    this.notifyPermissionChange();
                },
                options
            );
        });
    }

    /**
     * Calculate distance between two points using Haversine formula
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in kilometers
        const dLat = this.toRadians(lat2 - lat1);
        const dLon = this.toRadians(lon2 - lon1);
        
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distance in kilometers
    }

    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    /**
     * Find nearby stores based on user location
     */
    findNearbyStores(maxDistance = 25, maxResults = 5) {
        if (!this.userLocation) {
            throw new Error('User location not available');
        }

        const storesWithDistance = this.stores.map(store => {
            const distance = this.calculateDistance(
                this.userLocation.latitude,
                this.userLocation.longitude,
                store.latitude,
                store.longitude
            );

            return {
                ...store,
                distance: distance,
                distanceText: distance < 1 ? 
                    `${Math.round(distance * 1000)}m` : 
                    `${distance.toFixed(1)}km`
            };
        });

        // Filter by distance and sort
        return storesWithDistance
            .filter(store => store.distance <= maxDistance)
            .sort((a, b) => a.distance - b.distance)
            .slice(0, maxResults);
    }

    /**
     * Search for stores that carry a specific product
     */
    findStoresWithProduct(productName, maxDistance = 25, maxResults = 5) {
        if (!this.userLocation) {
            throw new Error('User location not available');
        }

        const nearbyStores = this.findNearbyStores(maxDistance, 20); // Get more stores to filter from
        
        // Filter stores that carry the product
        const storesWithProduct = nearbyStores.filter(store => 
            store.products.some(product => 
                product.toLowerCase().includes(productName.toLowerCase())
            )
        );

        return storesWithProduct.slice(0, maxResults);
    }

    /**
     * Load mock store data for demonstration
     */
    loadMockStores() {
        return [
            {
                id: 1,
                name: "Loblaws",
                address: "2885 Argentia Rd, Mississauga, ON L5N 8G6",
                phone: "(905) 826-0384",
                latitude: 43.5890,
                longitude: -79.6441,
                hours: "7:00 AM - 11:00 PM",
                products: ["KitKat", "Smarties", "Quality Street", "Coffee Crisp", "Aero"]
            },
            {
                id: 2,
                name: "Metro",
                address: "3045 Mavis Rd, Mississauga, ON L5B 4M6",
                phone: "(905) 270-3500",
                latitude: 43.5845,
                longitude: -79.6503,
                hours: "8:00 AM - 10:00 PM",
                products: ["KitKat", "Smarties", "Coffee Crisp", "Butterfinger"]
            },
            {
                id: 3,
                name: "Walmart Supercentre",
                address: "6040 Glen Erin Dr, Mississauga, ON L5N 3K4",
                phone: "(905) 824-1421",
                latitude: 43.5798,
                longitude: -79.6198,
                hours: "7:00 AM - 11:00 PM",
                products: ["KitKat", "Smarties", "Quality Street", "Coffee Crisp", "Aero", "Butterfinger"]
            },
            {
                id: 4,
                name: "Sobeys",
                address: "900 Rathburn Rd W, Mississauga, ON L5C 4L2",
                phone: "(905) 275-8500",
                latitude: 43.5965,
                longitude: -79.6321,
                hours: "8:00 AM - 10:00 PM",
                products: ["KitKat", "Quality Street", "Coffee Crisp", "Aero"]
            },
            {
                id: 5,
                name: "No Frills",
                address: "2550 Hurontario St, Mississauga, ON L5B 1N5",
                phone: "(905) 276-8111",
                latitude: 43.5721,
                longitude: -79.6441,
                hours: "8:00 AM - 9:00 PM",
                products: ["KitKat", "Smarties", "Coffee Crisp"]
            },
            {
                id: 6,
                name: "FreshCo",
                address: "3221 Derry Rd W, Mississauga, ON L5N 7L7",
                phone: "(905) 826-2200",
                latitude: 43.5834,
                longitude: -79.6578,
                hours: "8:00 AM - 10:00 PM",
                products: ["KitKat", "Smarties", "Quality Street", "Aero"]
            }
        ];
    }

    /**
     * Get formatted location status for display
     */
    getLocationStatus() {
        return {
            enabled: this.locationEnabled,
            permission: this.locationPermission,
            location: this.userLocation,
            statusText: this.getStatusText()
        };
    }

    getStatusText() {
        switch (this.locationPermission) {
            case 'granted':
                return this.locationEnabled ? 'Location Active' : 'Location Available';
            case 'denied':
                return 'Location Denied';
            case 'prompt':
                return 'Location Pending';
            default:
                return 'Location Unknown';
        }
    }

    /**
     * Event listener management
     */
    addEventListener(event, callback) {
        if (this.callbacks[event]) {
            this.callbacks[event].push(callback);
        }
    }

    removeEventListener(event, callback) {
        if (this.callbacks[event]) {
            const index = this.callbacks[event].indexOf(callback);
            if (index > -1) {
                this.callbacks[event].splice(index, 1);
            }
        }
    }

    notifyLocationUpdate() {
        this.callbacks.onLocationUpdate.forEach(callback => {
            try {
                callback(this.userLocation);
            } catch (error) {
                console.error('Error in location update callback:', error);
            }
        });
    }

    notifyPermissionChange() {
        this.callbacks.onPermissionChange.forEach(callback => {
            try {
                callback(this.getLocationStatus());
            } catch (error) {
                console.error('Error in permission change callback:', error);
            }
        });
    }

    /**
     * Generate location-based response for chatbot
     */
    generateStoreResponse(productName, nearbyStores) {
        if (!nearbyStores || nearbyStores.length === 0) {
            return `I couldn't find any nearby stores carrying ${productName}. You might want to check online retailers or call local stores directly.`;
        }

        let response = `Here are nearby stores where you can find ${productName}:\n\n`;
        
        nearbyStores.forEach((store, index) => {
            response += `${index + 1}. **${store.name}**\n`;
            response += `   📍 ${store.address}\n`;
            response += `   📞 ${store.phone}\n`;
            response += `   🕒 Hours: ${store.hours}\n`;
            response += `   📏 Distance: ${store.distanceText}\n\n`;
        });

        response += `💡 *Tip: Call ahead to confirm product availability.*`;
        
        return response;
    }

    /**
     * Public API methods
     */
    isLocationEnabled() {
        return this.locationEnabled;
    }

    getUserLocation() {
        return this.userLocation;
    }

    getPermissionStatus() {
        return this.locationPermission;
    }

    // Disable location services
    disableLocation() {
        this.locationEnabled = false;
        this.userLocation = null;
        this.notifyPermissionChange();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LocationService;
} else if (typeof window !== 'undefined') {
    window.LocationService = LocationService;
}