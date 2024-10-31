import { Component, NgZone, ViewChild } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { AlertController, IonicSafeString, LoadingController } from '@ionic/angular';
import { DomSanitizer } from '@angular/platform-browser';
import { Network } from '@capacitor/network';
import { AdMob, AdmobConsentStatus, AdMobError } from '@capacitor-community/admob';
import { BannerAdOptions, BannerAdSize, BannerAdPosition, BannerAdPluginEvents, AdMobBannerSize } from '@capacitor-community/admob';
import { AdOptions, AdLoadInfo, InterstitialAdPluginEvents } from '@capacitor-community/admob';
import { RewardAdOptions, RewardAdPluginEvents, AdMobRewardItem } from '@capacitor-community/admob';

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
declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
  }
}

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
  votersData: any;
  loading!: HTMLIonLoadingElement;
  message!: string | IonicSafeString;
  highlights: any = [];
  highlightsLoaded: number = 0;
  highlightsData: any;
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

  version: number = 21;
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
  livePicUrl: String = 'assets/images/live.jpg';
  player: any;
  url: any;


  constructor(
    public loadingController: LoadingController,
    public domSanitizer: DomSanitizer,
    private alertCtrl: AlertController,
    private zone: NgZone) {
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

      this.setupAds()
    });
  }

  getImagesLinks() {
    const db = getDatabase();
    const starCountRef = ref(db);
    get(child(starCountRef, "appInfo/imageLinks")).then(async (snapshot) => {
      if (snapshot.exists()) {
        let imageLinks = snapshot.val();
        if(imageLinks['livePic']){
          this.livePicUrl = imageLinks['livePic']
        }if(imageLinks['livePic']){
          this.logoUrl = imageLinks['logo']
        }
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
        let last_cleared_date = await getData("clear_local_storage")
        if(last_cleared_date == undefined){
          last_cleared_date = 0
          await setData("clear_local_storage", 0)
        }
        if(clear_local_storage > last_cleared_date){
          await clearData()
          await setData("clear_local_storage", clear_local_storage)
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
      for (var i = promoData.length - 1; i >= 0; i--) {
        if (promoData[i] != undefined) {
          let url = promoData[i]["url"]
          let embedUrl: any = this.domSanitizer.bypassSecurityTrustResourceUrl(promoData[i]["eUrl"])
          this.promos.push({ url: embedUrl, title: promoData[i]["title"], link: url});
        }
      }
    });
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

  getVotersData() {
    const db = getDatabase();
    const starCountRef = ref(db);
    get(child(starCountRef, 'polling/week' + this.week)).then(async (snapshot) => {
      if (snapshot.exists()) {
        var data = snapshot.val();
        this.votersData = data;
        this.isVotersData = true;
      } else {
      }
    }).catch((error) => {
      location.reload();
    });
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
      }
      else {
        setTimeout(() => {
          this.loader = false;
          this.loading.dismiss();
        },1000);
      }
    }
  }

  scroll() {
    setTimeout(() => {
      document.getElementById("chart")!.scrollIntoView({
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
        text: 'BiggBoss 8 Voting Results',
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
  
    const options: AdOptions = {
      adId: this.ads_control["interstitial_ad_id"],
      isTesting: this.ads_control["test_mode"]
      // npa: true
    };
    await AdMob.prepareInterstitial(options);
    await AdMob.showInterstitial();
  }
  
  async banner(): Promise<void> {
      AdMob.addListener(BannerAdPluginEvents.Loaded, () => {
        // Subscribe Banner Event Listener
        this.isBannerAdLoaded = true        
      });
  
      AdMob.addListener(BannerAdPluginEvents.SizeChanged, (size: AdMobBannerSize) => {
        // Subscribe Change Banner Size
      });
  
      const options: BannerAdOptions = {
        adId: this.ads_control["banner_ad_id"],
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
