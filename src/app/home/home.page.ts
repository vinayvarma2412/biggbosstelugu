import { Component, NgZone, ViewChild } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { AlertController, IonicSafeString, LoadingController } from '@ionic/angular';
import { DomSanitizer } from '@angular/platform-browser';
import { Network } from '@capacitor/network';
import { AdMob, AdmobConsentStatus, AdMobError } from '@capacitor-community/admob';
import { BannerAdOptions, BannerAdSize, BannerAdPosition, BannerAdPluginEvents, AdMobBannerSize } from '@capacitor-community/admob';
import { AdOptions, AdLoadInfo, InterstitialAdPluginEvents } from '@capacitor-community/admob';
import { RewardAdOptions, RewardAdPluginEvents, AdMobRewardItem } from '@capacitor-community/admob';
import { ImageCacheService } from '../services/image-cache.service';

import { child, get, getDatabase, limitToLast, onValue, query, ref, set } from "firebase/database";

import {
  ApexChart,
  ApexAxisChartSeries,
  ChartComponent,
  ApexDataLabels,
  ApexPlotOptions,
  ApexXAxis,
  ApexTitleSubtitle,
  ApexYAxis,
  ApexFill
} from "ng-apexcharts";
import { initializeApp } from 'firebase/app';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

declare var YT: any;

export type ChartOptions = {
  title: ApexTitleSubtitle;
  series: ApexAxisChartSeries;
  chart: ApexChart;
  dataLabels: ApexDataLabels;
  plotOptions: ApexPlotOptions;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis
  fill: ApexFill
};


export async function initialize(): Promise<void> {
  await AdMob.initialize();
 
  const [trackingInfo, consentInfo] = await Promise.all([
   AdMob.trackingAuthorizationStatus(),
   AdMob.requestConsentInfo(),
  ]);
 
  if (trackingInfo.status === 'notDetermined') { 
   await AdMob.requestTrackingAuthorization();
  }

  const authorizationStatus = await AdMob.trackingAuthorizationStatus();
  if (
          authorizationStatus.status === 'authorized' &&
          consentInfo.isConsentFormAvailable &&
          consentInfo.status === AdmobConsentStatus.REQUIRED
  ) {
   await AdMob.showConsentForm();
  }
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {

  @ViewChild("chart") chart!: ChartComponent;
  public chartOptions!: Partial<ChartOptions>;
  promos: any = [];
  slideOpts = {
    autoplay: true,
    loop: true
  };
  names: string[] = [];
  votes: number[] = [];
  dashboardOperationsInfo: boolean = false;
  id: any;
  isVoted: boolean = false;
  isVotersData: boolean = false;
  week: any;
  votersData: any = [];
  loading!: HTMLIonLoadingElement;
  message!: string | IonicSafeString;
  highlights: any = [];
  highlightsLoaded: number = 0;
  highlightsData: any = [];
  alert!: Promise<HTMLIonAlertElement>;
  connection: boolean = false;
  loader!: boolean;
  contestantsData: any = [];

  pollingSection: boolean = true;
  highlightsSection: boolean = true;
  promosSection: boolean = true;
  contestantsSection: boolean = false;
  pollingChartSection: boolean = false;
  shareBtn: boolean = false;
  winnerSection: boolean = false;

  version: number = 28;
  updateAlert!: Promise<HTMLIonAlertElement>;
  firstLoad: boolean = true;
  liveSection: boolean = true;
  liveLink: any = ""
  mode: any
  ads_control: any = {}

  logoUrl: any = "assets/icon/logo.jpg"

  downloadUrl = '';
  myFiles = [];
  downloadProgress = 0;
  borderColor!: string;
  contestantsSection1: boolean = false;
  isBannerAdLoaded: boolean = false;
  update_url: any;
  shareMessage:any;
  livePicUrl: String = '';
  players: any[] = [];
  playingCount: number = 0
  isFullScreen: boolean = false;
  winnerDetails: any = []


  constructor(
    public loadingController: LoadingController,
    public domSanitizer: DomSanitizer,
    private alertCtrl: AlertController,
    private ngZone: NgZone,
    private imageCacheService: ImageCacheService) {
    this.networkStatus();
  }

  async ngOnInit() {
    this.alert = this.alertCtrl.create({
      header: 'Connection Lost',
      subHeader: 'Please turn on your internet',
      backdropDismiss: false
    });

    this.message = "Loading..."
    Network.addListener('networkStatusChange', status => {
      if (!status.connected) {
        this.connection = false
        this.showToast();
      }
    });

    let theme = await getData("theme")
    if (theme != null) {
      this.changeTheme(theme)
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
      this.mode = prefersDark.matches
      this.colorTest(prefersDark)
    }
    // addListeners()
    document.addEventListener('fullscreenchange', this.onFullScreenChange.bind(this));
  }

  onFullScreenChange() {
    this.ngZone.run(() => {
      this.isFullScreen = !!document.fullscreenElement;
      this.hideOrResumeBannerAd()
    });
  }

  ngOnDestroy() {
    // Clean up the event listeners when the component is destroyed
    document.removeEventListener('fullscreenchange', this.onFullScreenChange.bind(this));
  }

  async setupAds(){
    const db = getDatabase();
    const starCountRef = ref(db);
    get(child(starCountRef, "appInfo/ads_control")).then(async (snapshot) => {
      if (snapshot.exists()) {
        this.ads_control = snapshot.val();
        if(this.ads_control["banner_ad"]){
          this.banner()
        }
      }
    }).catch((error) => {
    });
  }

  onClick(event: any) {
    setData("theme", event.detail.checked)
    this.changeTheme(event.detail.checked)
  }

  changeTheme(mode: any) {
    this.mode = mode
    if (mode) {
      document.body.setAttribute('data-theme', 'dark');
      this.borderColor = "#fff"
    }
    else {
      document.body.setAttribute('data-theme', 'light');
      this.borderColor = "#000"
    }
    
    if (this.votersData != undefined) {
      this.white()
      if (this.id != undefined) {
        document.getElementById("card" + this.id)!.style.backgroundImage = "linear-gradient(to right bottom, #304758, #304758)"
        document.getElementById("label" + this.id)!.style.color = "#fff"
      }
    }
  }

  colorTest(systemInitiatedDark: any) {
    if (systemInitiatedDark.matches) {
      document.body.setAttribute('data-theme', 'dark');
      this.borderColor = "#fff"
    } else {
      document.body.setAttribute('data-theme', 'light');
      this.borderColor = "#000"
    }
  }

  enableFirebase() {
    const firebase = {
      projectId: 'biggbosstelugu-b49b4',
      appId: '1:786263237715:web:1c50fabe75a5ece55192a6',
      databaseURL: 'https://biggbosstelugu-b49b4-default-rtdb.firebaseio.com',
      storageBucket: 'biggbosstelugu-b49b4.appspot.com',
      apiKey: 'AIzaSyCvIdlzjh6tsbUQaiQh_POIuxQtDv0R-VE',
      authDomain: 'biggbosstelugu-b49b4.firebaseapp.com',
      messagingSenderId: '786263237715',
      measurementId: 'G-KN4XPGDRWT',
    };
    const app = initializeApp(firebase);
    const database = getDatabase(app);
    this.presentLoadingWithOptions();
    this.getVersionUpdate()
    const isPushNotificationsAvailable = Capacitor.isPluginAvailable('PushNotifications');
    if(isPushNotificationsAvailable){
      registerNotifications()
      getDeliveredNotifications()
    }
  }

  async getSectionControlls() {
    const db = getDatabase();
    const starCountRef = query(ref(db, "appInfo/sectionControlls"));
    onValue(starCountRef, (snapshot) => {
      let sectionControlls = snapshot.val();
      this.pollingSection = sectionControlls["pollingSection"]
      this.contestantsSection = sectionControlls["contestantsSection"]
      this.promosSection = sectionControlls["promosSection"]
      this.highlightsSection = sectionControlls["highlightsSection"]
      this.liveSection = sectionControlls["liveSection"]
      this.pollingChartSection = sectionControlls["pollingChartSection"]
      this.shareBtn = sectionControlls["shareBtn"]
      this.winnerSection = sectionControlls["winnerSection"]

      this.getImagesLinks();

      if (!this.pollingSection) {
        setTimeout(() => {
          this.loader = false;
          this.loading.dismiss();
        }, 3000);
      }
      if (this.contestantsSection) {
        this.getContestantsInfo();
      }
      if (this.pollingSection) {
        this.getWeek();
      }

      if (this.promosSection) {
        this.getPromos();
      }
      if (this.highlightsSection) {
        this.getHighlights();
      }

      if (this.liveSection) {
        this.getLiveUrl();
      }

      if (this.shareBtn) {
        this.getShareMessage();
      }

      if (this.winnerSection) {
        this.getWinnerDetails();
      }

      this.setupAds()
    });
  }

  getImagesLinks() {
    const db = getDatabase();
    const starCountRef = ref(db);
    get(child(starCountRef, "appInfo/imageLinks")).then(async (snapshot) => {
      if (snapshot.exists()) {
        let imageLinks = snapshot.val();
        
        // Process livePic image caching
        if(imageLinks['livePic']){
          this.livePicUrl = await this.getCachedImageUrl('livePic', imageLinks['livePic']);
        }
        
        // Process logo image caching
        if(imageLinks['logo']){
          this.logoUrl = await this.getCachedImageUrl('logo', imageLinks['logo']);
        }
      }
    }).catch((error) => {
      console.error('Error getting image links:', error);
    });
  }

  getWinnerDetails() {
    const db = getDatabase();
    const starCountRef = ref(db);
    get(child(starCountRef, "winnerDetails")).then(async (snapshot) => {
      if (snapshot.exists()) {
        this.winnerDetails = snapshot.val();
        await this.processImages(this.winnerDetails, 'img', 'name', 'cachedImgUrl');
        this.winnerDetails[0]['desc'] = this.winnerDetails[0]['desc'].replaceAll("\\n", "\n");
        this.winnerDetails[1]['desc'] = this.winnerDetails[1]['desc'].replaceAll("\\n", "\n");
        this.winnerDetails[2]['desc'] = this.winnerDetails[2]['desc'].replaceAll("\\n", "\n");
      } else {
      }
    }).catch((error) => {
    });
  }

  getShareMessage() {
    const db = getDatabase();
    const starCountRef = ref(db);
    get(child(starCountRef, "appInfo/share")).then(async (snapshot) => {
      if (snapshot.exists()) {
        this.shareMessage = snapshot.val();
        this.shareMessage['text'] = this.shareMessage['text'].replaceAll("\\n", "\n");
      } else {
      }
    }).catch((error) => {
    });
  }

  getLiveUrl() {
    const db = getDatabase();
    const starCountRef = ref(db);
    get(child(starCountRef, "appInfo/liveLink")).then(async (snapshot) => {
      if (snapshot.exists()) {
        this.liveLink = snapshot.val();
      } else {
      }
    }).catch((error) => {
    });
  }

  async networkStatus() {
    const status = await Network.getStatus();
    this.connection = Boolean(status.connected);
    if (this.connection) {
      initialize()
      this.enableFirebase()
    }
    else {
      this.showToast();
    }
  }

  openLink(link: any){
    window.location.href = link;
  }

  getVersionUpdate() {
    const db = getDatabase();
    const starCountRef = ref(db);
    get(child(starCountRef, "appInfo/versionUpdate")).then(async (snapshot) => {
      if (snapshot.exists()) {
        let versionDetails = snapshot.val();
        let versionNumber = versionDetails["versionNumber"]
        let showUpdate = versionDetails["showUpdate"]
        this.update_url = versionDetails["update_url"]
        let clear_local_storage = versionDetails["clear_local_storage"]
        let cacheVersion = versionDetails["cacheVersion"] || 0
        
        // Handle local storage clearing
        let last_cleared_date = await getData("clear_local_storage")
        if(last_cleared_date == undefined){
          last_cleared_date = 0
          await setData("clear_local_storage", 0)
        }
        if(clear_local_storage > last_cleared_date){
          await clearData()
          await setData("clear_local_storage", clear_local_storage)
        }

        // Handle cache version clearing
        let localCacheVersion = await getData("localCacheVersion")
        if(localCacheVersion == undefined){
          localCacheVersion = 0
          await setData("localCacheVersion", 0)
        }
        
        // Clear cache if server cache version is higher than local cache version
        if(cacheVersion > localCacheVersion){
          console.log(`Cache version update detected: ${localCacheVersion} -> ${cacheVersion}`);
          await this.clearImageCache({
            showLoading: false,
            onSuccess: () => {
              console.log('Cache cleared successfully due to version update');
            },
            onError: (error) => {
              console.error('Failed to clear cache during version update:', error);
            }
          });
          // Update local cache version
          await setData("localCacheVersion", cacheVersion);
        }

        if (this.version < versionNumber) {
          this.getSectionControlls();
          if (showUpdate) {
            let buttons = [
              {
                text: 'Later',
                handler: async () => {
                  (await this.updateAlert).dismiss();
                }
              },
              {
                text: 'Update',
                handler: () => {
                  window.open(this.update_url);
                  location.reload();
                }
              }]
            this.showUpdateToast(buttons);
          }
          else {
            let buttons = [{
              text: 'Update',
              handler: () => {
                window.open(this.update_url);
                location.reload();
              }
            }]
            this.showUpdateToast(buttons);
          }
        }
        else {
          this.getSectionControlls();
        }
      } else {
      }
    }).catch((error) => {
      location.reload();
    });
  }

  async showUpdateToast(buttons: any) {
    this.updateAlert = this.alertCtrl.create({
      header: 'New Update',
      subHeader: 'You are using older vesion, Please Update',
      backdropDismiss: false,
      buttons: buttons
    });
    (await this.updateAlert).present();
  }

  async showToast() {
    this.alert = this.alertCtrl.create({
      header: 'Connection Lost',
      subHeader: 'Please check your internet connection',
      backdropDismiss: false,
      buttons: [
        {
          text: 'Try Again',
          handler: () => {
            location.reload();
          }
        }]
    });
    (await this.alert).present();
  }

  async presentLoadingWithOptions() {
    this.loading = await this.loadingController.create({
      spinner: "bubbles",
      message: this.message,
      translucent: false,
      cssClass: 'loader',
      backdropDismiss: false
    });
    await this.loading.present();
    this.loader = true;
    setTimeout(() => {
      if (this.loader) {
        this.showToast()
      }
    }, 30000);
  }

  alreadyVoted() {
    document.getElementById("card" + this.id)!.style.backgroundImage = "linear-gradient(to right bottom, #304758, #304758)"
    document.getElementById("label" + this.id)!.style.color = "#fff"
    document.getElementById("voteBtn")!.style.backgroundColor = "#0BC604";
    document.getElementById("voteBtn")!.innerHTML = "Voted"
    document.getElementById("message")!.innerHTML = "You have already voted for this week"
    this.scroll();
    if(this.ads_control["reward_ad"]){
      setTimeout(() => {
        this.rewardVideo()
      },1000)
    }else{
      if(this.ads_control["interitial_ad"]){
        setTimeout(() => {
          this.interstitial()
        },1000)
      }
    }
  }

  async getPromos() {
    const db = getDatabase();
    const starCountRef = query(ref(db, "promos/"), limitToLast(4));
    onValue(starCountRef, (snapshot) => {
      let promoData: any = Object.values(snapshot.val());
      this.promos = promoData.reverse()
      setTimeout(() => {
        this.loadPlayers()
      },200);
    });
  }

  loadPlayers(){
    for (var i = 0; i<this.promos.length; i++) {
      let videoId = this.getYoutubeVideoId(this.promos[i]['url'])
      this.players[i] = new YT.Player(`player-${i}`, {
        width:"100%",
        height:"315",
        videoId: videoId,
        events: {
          onStateChange: (event: any) => this.onPlayerStateChange(event)
        }
      });
    }
  }

  getYoutubeVideoId(url: any){
    return url.split('/').pop().split('?')[0];
  }

  onPlayerStateChange(event: any) {
    // Check if the player is playing
    if (event.data === YT.PlayerState.PLAYING) {
      this.ngZone.run(() => {
        this.playingCount += 1
        this.hideOrResumeBannerAd()
      });
    }
    else if(event.data === YT.PlayerState.PAUSED){
      this.ngZone.run(() => {
        this.playingCount -= 1
        this.hideOrResumeBannerAd()
      });
    }
  }

  hideOrResumeBannerAd(){
    if(this.playingCount>0 || this.isFullScreen){
      this.hideBannerAd()
    }else{
      this.resumeBannerAd()
    }
  }

  getContestantsInfo() {
    const db = getDatabase();
    const starCountRef = ref(db);
    get(child(starCountRef, "contestants/")).then(async (snapshot) => {
      if (snapshot.exists()) {
        this.slideOpts = {
          autoplay: true,
          loop: true
        };
        let data = snapshot.val();
        this.contestantsData = data
        if (this.contestantsSection) {
          this.contestantsSection1 = true
        }
        await this.processImages(this.contestantsData, 'url', 'name', 'cachedImgUrl');
      } else {
      }
    }).catch((error) => {
    });
  }

  getHighlights() {
    const db = getDatabase();
    const starCountRef = ref(db);
    get(child(starCountRef, "highlights/")).then(async (snapshot) => {
      if (snapshot.exists()) {
        this.highlightsData = snapshot.val();
        this.highlightsData.reverse();
        // await this.processImages(this.highlightsData, 'imgUrl', 'key', 'cachedImgUrl');
        this.moreHiglights()
      } else {
      }
    }).catch((error) => {
    });
  }

  moreHiglights() {
    for (var i = this.highlightsLoaded; i <= this.highlightsLoaded + 3; i++) {
      if (this.highlightsData[i] != undefined) {
        this.highlights[i] = this.highlightsData[i];
      }
      else {
        document.getElementById("highlightBtn")!.style.visibility = "hidden"
      }
    }
    this.highlightsLoaded = this.highlightsLoaded + 4;
  }

  getWeek() {
    const db = getDatabase();
    const starCountRef = ref(db);
    get(child(starCountRef, "appInfo/week")).then(async (snapshot) => {
      if (snapshot.exists()) {
        this.week = snapshot.val();
        this.id = await getData('voted' + this.week)
        if (this.id != undefined && this.id != null) {
          this.isVoted = true;
        }
        this.getPollingData();
      } else {
      }
    }).catch((error) => {
      location.reload();
    });
  }

  async getVotersData() {
    const db = getDatabase();
    const starCountRef = ref(db);
    get(child(starCountRef, 'polling/week' + this.week)).then(async (snapshot) => {
      if (snapshot.exists()) {
        var data = snapshot.val();
        this.votersData = data;
        this.isVotersData = true;
        
        // Process images for caching
        await this.processImages(this.votersData, 'imgUrl', 'name', 'cachedImgUrl');
      } else {
      }
    }).catch((error) => {
      location.reload();
    });
  }

  /**
   * Process images for caching - Generic method
   * Downloads and caches images if not already cached
   * @param data - Array of objects containing image data
   * @param imageKey - Key name for the image URL property (e.g., 'imgUrl', 'imageUrl')
   * @param uniqueKey - Key name for the unique identifier (e.g., 'name', 'id')
   * @param cachedImageKey - Key name for the cached image URL property (e.g., 'cachedImgUrl')
   */
  async processImages(data: any[], imageKey: string, uniqueKey: string, cachedImageKey: string = 'cachedImgUrl') {
    if (!data || !Array.isArray(data)) {
      return;
    }

    const imagePromises = data.map(async (item: any, index: number) => {
      const imageUrl = item[imageKey];
      const uniqueId = item[uniqueKey];
      
      if (imageUrl && uniqueId) {
        try {
          // Check if image is already cached
          let cachedPath = await this.imageCacheService.getCachedImagePath(uniqueId);
          
          if (!cachedPath) {
            // Download and cache the image
            cachedPath = await this.imageCacheService.cacheImage(uniqueId, imageUrl);
          }
          
          // Update the item data with cached path if available
          if (cachedPath) {
            // For web platform, convert to data URL; for native, use file URI
            const displayUrl = await this.imageCacheService.getCachedImageAsDataUrl(cachedPath);
            
            if (displayUrl) {
              item[cachedImageKey] = displayUrl;
            } else {
              // Cached file doesn't exist or failed to read, re-download
              const newCachedPath = await this.imageCacheService.cacheImage(uniqueId, imageUrl);
              if (newCachedPath) {
                const newDisplayUrl = await this.imageCacheService.getCachedImageAsDataUrl(newCachedPath);
                item[cachedImageKey] = newDisplayUrl || null; // Don't fallback to original URL
              } else {
                item[cachedImageKey] = null; // Don't show image if caching fails
              }
            }
          } else {
            // Try to download and cache the image
            const newCachedPath = await this.imageCacheService.cacheImage(uniqueId, imageUrl);
            if (newCachedPath) {
              const displayUrl = await this.imageCacheService.getCachedImageAsDataUrl(newCachedPath);
              item[cachedImageKey] = displayUrl || null; // Don't fallback to original URL
            } else {
              item[cachedImageKey] = null; // Don't show image if caching fails
            }
          }
        } catch (error) {
          console.error(`Error processing image for ${uniqueId}:`, error);
          // Don't show image if processing fails
          item[cachedImageKey] = null;
        }
      } else {
        // No image URL or unique ID, don't show image
        item[cachedImageKey] = null;
      }
    });

    // Wait for all images to be processed
    await Promise.all(imagePromises);
    
    // Trigger change detection to update the UI
    this.ngZone.run(() => {
      // Force Angular to detect changes
      data = [...data];
    });
  }

  /**
   * Process voter images for caching
   * Downloads and caches images if not already cached
   * @deprecated Use processImages() instead for better flexibility
   */
  async processVoterImages() {
    await this.processImages(this.votersData, 'imgUrl', 'name', 'cachedImgUrl');
  }

  /**
   * Refresh cached images for all voters
   * Useful when you want to force re-download of images
   * @deprecated Use refreshImages() instead for better flexibility
   */
  async refreshVoterImages() {
    await this.refreshImages(this.votersData, 'imgUrl', 'name', 'cachedImgUrl');
  }

  /**
   * Refresh cached images for any data array
   * Useful when you want to force re-download of images
   * @param data - Array of objects containing image data
   * @param imageKey - Key name for the image URL property
   * @param uniqueKey - Key name for the unique identifier
   * @param cachedImageKey - Key name for the cached image URL property
   */
  async refreshImages(data: any[], imageKey: string, uniqueKey: string, cachedImageKey: string = 'cachedImgUrl') {
    if (!data || !Array.isArray(data)) {
      return;
    }

    // Clear cache for all items
    const clearPromises = data.map(async (item: any) => {
      const uniqueId = item[uniqueKey];
      if (uniqueId) {
        try {
          // Clear individual cache entry (this would need to be added to the service)
          await this.clearImageCache();
        } catch (error) {
          console.error(`Error clearing cache for ${uniqueId}:`, error);
        }
      }
    });

    await Promise.all(clearPromises);
    
    // Re-process images
    await this.processImages(data, imageKey, uniqueKey, cachedImageKey);
  }

  getPollingData() {
    const db = getDatabase();
    const starCountRef = ref(db, 'polling/week' + this.week);
    onValue(starCountRef, async (snapshot) => {
      var data = await snapshot.val();
      if (data != null) {
        this.votes = [];
        this.names = [];
        data.sort(function (a: any, b: any) { return (b.votes + b.manualVotes) - (a.votes + a.manualVotes); });
        for (var i = 0; i < data.length; i++) {
          let manualVotes = data[i]["manualVotes"] ?? 0
          let votes = data[i]["votes"] + manualVotes
          this.votes.push(votes)
          this.names.push(data[i]["name"])
        }
        if (this.firstLoad) {
          this.getVotersData();
          this.firstLoad = false;
        }
        else {
          if (this.isVoted) {
            this.createPollChart();
          }
        }
      }
    });
  }

  insertData(url: any, data: any) {
    const db = getDatabase();
    set(ref(db, url), data);
  }

  selected(n: any) {
    if (!this.isVoted) {
      var wait = this.white();
      if (wait) {
        document.getElementById("card" + n)!.style.backgroundImage = "linear-gradient(to right bottom, #304758, #304758)"
        document.getElementById("label" + n)!.style.color = "#fff"
        this.id = n;
        this.firstLoad = true;
      }
    }
  }

  white() {
    for (var i = 0; i < this.votersData.length; i++) {
      document.getElementById("card" + i)!.style.backgroundImage = "none"
      document.getElementById("label" + i)!.style.color = this.borderColor
      document.getElementById("label" + i)!.style.border = this.borderColor
    }
    return true;
  }

  async voted() {
    if (this.id != undefined && !this.isVoted) {
      await setData('voted' + this.week, this.id);
      this.isVoted = true
      var pVotes = this.votersData[this.id]["votes"]

      document.getElementById("voteBtn")!.style.backgroundColor = "#0BC604";
      document.getElementById("voteBtn")!.innerHTML = "Voted"
      document.getElementById("message")!.innerHTML = "You are Already Voted"
      this.insertData('polling/week' + this.week + "/" + this.id + "/" + "votes", (Number(pVotes) + 1))
    }
  }

  onImageLoad(i: any) {
    if (this.votersData.length - 1 == i) {
      if (this.isVoted) {
        this.createPollChart();
        this.alreadyVoted();
      } else {
        setTimeout(() => {
          this.loader = false;
          this.loading.dismiss();
        }, 1000);
      }
    }
  }

  /**
   * Handle image load error for any data array
   * @param data - Array of objects containing image data
   * @param uniqueId - Unique identifier for the item
   * @param url - The failed image URL
   * @param imageKey - Key name for the image URL property
   * @param uniqueKey - Key name for the unique identifier
   * @param cachedImageKey - Key name for the cached image URL property
   */
  onImageErrorGeneric(data: any[], uniqueId: string, url: string, imageKey: string, uniqueKey: string, cachedImageKey: string = 'cachedImgUrl') {
    // If it's a data URL that's incomplete, try to re-download the image
    if (url && url.startsWith('data:image/') && url.endsWith(',')) {
      this.redownloadImageGeneric(data, uniqueId, imageKey, uniqueKey, cachedImageKey);
    }
  }

  /**
   * Handle voter image load error
   * @deprecated Use onImageErrorGeneric() instead for better flexibility
   */
  onImageError(name: string, url: string) {
    this.onImageErrorGeneric(this.votersData, name, url, 'imgUrl', 'name', 'cachedImgUrl');
  }

  /**
   * Re-download a specific image by unique identifier
   * @param data - Array of objects containing image data
   * @param uniqueId - Unique identifier to find the item
   * @param imageKey - Key name for the image URL property
   * @param uniqueKey - Key name for the unique identifier
   * @param cachedImageKey - Key name for the cached image URL property
   */
  async redownloadImageGeneric(data: any[], uniqueId: string, imageKey: string, uniqueKey: string, cachedImageKey: string = 'cachedImgUrl') {
    try {
      // Find the item and get their original image URL
      const item = data.find((v: any) => v[uniqueKey] === uniqueId);
      if (item && item[imageKey]) {
        // Clear the cached path and re-download
        await this.clearImageCache();
        const newCachedPath = await this.imageCacheService.cacheImage(uniqueId, item[imageKey]);
        
        if (newCachedPath) {
          const displayUrl = await this.imageCacheService.getCachedImageAsDataUrl(newCachedPath);
          if (displayUrl) {
            item[cachedImageKey] = displayUrl;
            // Trigger change detection
            this.ngZone.run(() => {
              data = [...data];
            });
          }
        }
      }
    } catch (error) {
      console.error('Error re-downloading image for', uniqueId, error);
    }
  }

  /**
   * Re-download a specific voter image by name
   * @deprecated Use redownloadImageGeneric() instead for better flexibility
   */
  async redownloadImage(name: string) {
    await this.redownloadImageGeneric(this.votersData, name, 'imgUrl', 'name', 'cachedImgUrl');
  }

  /**
   * Generic method to clear image cache
   * @param options - Optional configuration for cache clearing
   * @param options.showLoading - Whether to show loading indicator during cache clearing
   * @param options.onSuccess - Callback function to execute on successful cache clearing
   * @param options.onError - Callback function to execute on cache clearing error
   * @returns Promise<boolean> - True if cache was cleared successfully, false otherwise
   */
  async clearImageCache(options: {
    showLoading?: boolean;
    onSuccess?: () => void;
    onError?: (error: any) => void;
  } = {}): Promise<boolean> {
    const {
      showLoading = false,
      onSuccess,
      onError
    } = options;

    try {
      if (showLoading) {
        this.message = "Clearing cache...";
        await this.presentLoadingWithOptions();
      }

      // Clear the image cache
      await this.imageCacheService.clearCache();
      
      console.log('Image cache cleared successfully');
      
      if (onSuccess) {
        onSuccess();
      }

      if (showLoading) {
        this.loading.dismiss();
      }

      return true;
    } catch (error) {
      console.error('Error clearing image cache:', error);
      
      if (onError) {
        onError(error);
      }

      if (showLoading) {
        this.loading.dismiss();
      }

      return false;
    }
  }

  /**
   * Common function for single URL caching - gets cached URL
   * @param cacheKey - Unique key to identify the cached image
   * @param imageUrl - The URL of the image to cache
   * @param fallbackToOriginal - Whether to fallback to original URL if caching fails (default: true)
   * @returns Promise<string> - Cached image URL or original URL as fallback
   */
  async getCachedImageUrl(cacheKey: string, imageUrl: string, fallbackToOriginal: boolean = true): Promise<string> {
    try {
      // Check if image is already cached
      let cachedPath = await this.imageCacheService.getCachedImagePath(cacheKey);
      
      if (!cachedPath) {
        // Download and cache the image
        cachedPath = await this.imageCacheService.cacheImage(cacheKey, imageUrl);
      }
      
      // Use cached image if available
      if (cachedPath) {
        const displayUrl = await this.imageCacheService.getCachedImageAsDataUrl(cachedPath);
        if (displayUrl) {
          return displayUrl;
        }
      }
      
      // Fallback to original URL if caching failed and fallback is enabled
      if (fallbackToOriginal) {
        console.warn(`Failed to cache image for key '${cacheKey}', using original URL`);
        return imageUrl;
      }
      
      // Return empty string if no fallback
      return '';
    } catch (error) {
      console.error(`Error caching image for key '${cacheKey}':`, error);
      
      // Fallback to original URL if caching failed and fallback is enabled
      if (fallbackToOriginal) {
        console.warn(`Error caching image for key '${cacheKey}', using original URL`);
        return imageUrl;
      }
      
      // Return empty string if no fallback
      return '';
    }
  }

  scroll() {
    let section = "chart"
    if(this.winnerSection){
      section = "winnerSection"
    }
    setTimeout(() => {
      document.getElementById(section)!.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest"
      });
      this.loader = false;
      this.loading.dismiss();
    }, 500);
  }

  async setStorageData() {
    await Preferences.set({
      key: 'voted' + this.week,
      value: this.id
    });
  };

  createPollChart() {
    this.chartOptions = {
      title: {
        text: 'BB 9 Voting Results',
      },
      series: [{
        name: "votes",
        data: this.votes
      }],
      chart: {
        type: 'bar',
        height: 350,
        toolbar: {
          show: false
        }
      },
      plotOptions: {
        bar: {
          borderRadius: 4,
          horizontal: true,
        }
      },
      dataLabels: {
        enabled: true,
        offsetX: 30,
        formatter: function (val: any) {
          return val + " votes";
        },
        style: {
          fontSize: '14px',
          fontFamily: 'Helvetica, Arial, sans-serif',
          fontWeight: 'bold',
          colors: ["rgb(242,208,15)"]
        }
      },
      fill: {
        colors: ['rgb(48,71,88)']
      },
      xaxis: {
        labels: {
          show: false
        },
        categories: this.names,
      },
      yaxis: {
        labels: {
          style: {
            fontSize: '12px',
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold',
            colors: ["#304758"]
          }
        },
      }
    };
    this.dashboardOperationsInfo = true;
  }

  async share(){
    await Share.share(this.shareMessage);
  }

  async showConsent() {
    const consentInfo = await AdMob.requestConsentInfo();
  
    if (consentInfo.isConsentFormAvailable && consentInfo.status === AdmobConsentStatus.REQUIRED) {
      const {status} = await AdMob.showConsentForm();
    }
  }

  async interstitial(): Promise<void> {
    AdMob.addListener(InterstitialAdPluginEvents.Loaded, (info: AdLoadInfo) => {
      // Subscribe prepared interstitial
    });

    // Get platform-specific ad ID
    const platform = Capacitor.getPlatform();
    let adId: string;
    
    if (platform === 'android') {
      adId = this.ads_control["interstitial_ad_id"];
    } else if (platform === 'ios') {
      adId = this.ads_control["ios_interstitial_ad_id"];
    } else {
      // Fallback to default interstitial_ad_id for web or other platforms
      adId = this.ads_control["interstitial_ad_id"];
    }
  
    const options: AdOptions = {
      adId: adId,
      isTesting: this.ads_control["test_mode"]
      // npa: true
    };
    await AdMob.prepareInterstitial(options);
    await AdMob.showInterstitial();
  }

  async hideBannerAd(): Promise<void> {
    AdMob.hideBanner().catch(err => {
      console.error('Error hiding banner ad:', err.message);
    });
  }

  async resumeBannerAd(): Promise<void> {
    AdMob.resumeBanner().catch(err => {
      console.error('Error resuming banner ad:', err.message);
    });
  }
  
  async banner(): Promise<void> {
      AdMob.addListener(BannerAdPluginEvents.Loaded, () => {
        // Subscribe Banner Event Listener
        this.isBannerAdLoaded = true        
      });
  
      AdMob.addListener(BannerAdPluginEvents.SizeChanged, (size: AdMobBannerSize) => {
        // Subscribe Change Banner Size
      });

      // Get platform-specific ad ID
      const platform = Capacitor.getPlatform();
      let adId: string;
      
      if (platform === 'android') {
        adId = this.ads_control["banner_ad_id"];
      } else if (platform === 'ios') {
        adId = this.ads_control["ios_banner_ad_id"];
      } else {
        // Fallback to default banner_ad_id for web or other platforms
        adId = this.ads_control["banner_ad_id"];
      }
  
      const options: BannerAdOptions = {
        adId: adId,
        isTesting: this.ads_control["test_mode"],
        adSize: BannerAdSize.BANNER,
        position: BannerAdPosition.BOTTOM_CENTER,
        margin: 0,
      };
      AdMob.showBanner(options);
  }

  async rewardVideo(): Promise<void> {
    AdMob.addListener(RewardAdPluginEvents.Loaded, (info: AdLoadInfo) => {
      // Subscribe prepared rewardVideo
    });

    AdMob.addListener(RewardAdPluginEvents.FailedToLoad, (error: AdMobError) => {
      if(this.ads_control["interitial_ad"]){
        this.interstitial()
      }
    });

    AdMob.addListener(RewardAdPluginEvents.Rewarded, (rewardItem: AdMobRewardItem) => {
      // Subscribe user rewarded
    });

    const options: RewardAdOptions = {
      adId: this.ads_control["rewarded_ad_id"],
      isTesting: this.ads_control["test_mode"]
    };
    await AdMob.prepareRewardVideoAd(options);
    const rewardItem = await AdMob.showRewardVideoAd();
  }

}

export async function setData(key: string, value: any): Promise<void> {
  await Preferences.set({
    key: key,
    value: JSON.stringify(value)
  });
}

export async function getData(key: string): Promise<any> {
  // const item = await Storage.get({ key: key });
  const item = await Preferences.get({ key: key });
  if (item.value == undefined || item.value == null) {
    return undefined;
  } else {
    return JSON.parse(item.value);
  }
}

//Remove values from the capacitor storage
export async function removeData(key: string): Promise<void> {
  await Preferences.remove({ key: key });
}

export async function clearData(): Promise<void> {
  await Preferences.clear();
}

// const addListeners = async () => {
//   await PushNotifications.addListener('registration', token => {
//     console.info('Registration token: ', token.value);
//   });

//   await PushNotifications.addListener('registrationError', err => {
//   });

//   await PushNotifications.addListener('pushNotificationReceived', notification => {
//   });

//   await PushNotifications.addListener('pushNotificationActionPerformed', notification => {
//   });
// }

const registerNotifications = async () => {
  let permStatus = await PushNotifications.checkPermissions();

  if (permStatus.receive === 'prompt') {
    permStatus = await PushNotifications.requestPermissions();
  }

  if (permStatus.receive !== 'granted') {
    throw new Error('User denied permissions!');
  }

  await PushNotifications.register();
}

const getDeliveredNotifications = async () => {
  const notificationList = await PushNotifications.getDeliveredNotifications();
}

