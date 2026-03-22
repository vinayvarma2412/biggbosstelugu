import { Component, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Preferences } from '@capacitor/preferences';
import { getDatabase, ref, get, set } from 'firebase/database';
import { Capacitor } from '@capacitor/core';

@Component({
  selector: 'app-custom-ad-modal',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title></ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()" fill="clear">
            <ion-icon name="close" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="custom-ad-content" [class.dark-mode]="isDarkMode" [class.light-mode]="!isDarkMode">
      <div class="custom-ad-container">
        <div class="custom-ad-text-wrapper" *ngIf="adData?.title || adData?.description">
          <h2 *ngIf="adData?.title" class="custom-ad-title" [innerHTML]="sanitizeHtml(adData.title)"></h2>
          <p *ngIf="adData?.description" class="custom-ad-description" [innerHTML]="sanitizeHtml(adData.description)"></p>
        </div>
        <div class="custom-ad-image-wrapper">
          <img 
            *ngIf="adData?.imageUrl" 
            [src]="adData?.imageUrl" 
            alt="Ad" 
            class="custom-ad-image"
            [class.clickable]="adData?.showButton && adData?.buttonLink"
            (click)="onImageClick()"
            (error)="onImageError()"
          />
        </div>
        <div class="custom-ad-code-wrapper" *ngIf="adData?.showPromoCode && adData?.promoCode">
          <div class="custom-ad-code-label">
            <ion-icon name="ticket" class="code-icon"></ion-icon>
            <span>{{ adData?.promoCodeLabel || 'Use Promo Code' }}</span>
          </div>
          <div class="custom-ad-code-container">
            <div class="custom-ad-code-display">
              <span class="custom-ad-code-highlight">{{ adData.promoCode }}</span>
            </div>
            <ion-button 
              (click)="copyToClipboard()"
              class="custom-ad-copy-button"
              fill="solid"
              size="default"
            >
              <ion-icon [name]="isCopied ? 'checkmark-circle' : 'copy-outline'" slot="icon-only"></ion-icon>
            </ion-button>
          </div>
        </div>
        <div class="custom-ad-button-wrapper" *ngIf="adData?.showButton && adData?.buttonLabel && adData?.buttonLink">
          <ion-button 
            (click)="openLink()"
            class="custom-ad-button"
            expand="block"
            color="primary"
          >
            {{ adData.buttonLabel }}
          </ion-button>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .custom-ad-content {
      --background: rgba(0, 0, 0, 0.6);
    }
    
    .custom-ad-content.light-mode {
      --background: rgba(255, 255, 255, 0.6);
    }
    
    .custom-ad-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: 20px;
      min-height: 100%;
      box-sizing: border-box;
    }
    
    .custom-ad-text-wrapper {
      width: 100%;
      text-align: center;
      margin-bottom: 20px;
      padding: 0 10px;
    }
    
    .custom-ad-title {
      color: white;
      font-size: 24px;
      font-weight: bold;
      margin: 0 0 10px 0;
      line-height: 1.3;
    }
    
    .light-mode .custom-ad-title {
      color: #000;
    }
    
    .custom-ad-description {
      color: rgba(255, 255, 255, 0.9);
      font-size: 16px;
      margin: 0;
      line-height: 1.5;
    }
    
    .light-mode .custom-ad-description {
      color: rgba(0, 0, 0, 0.8);
    }
    
    .custom-ad-description ::ng-deep * {
      color: rgba(255, 255, 255, 0.9);
    }
    
    .light-mode .custom-ad-description ::ng-deep * {
      color: rgba(0, 0, 0, 0.8);
    }
    
    .custom-ad-image-wrapper {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      margin-bottom: 20px;
    }
    
    .custom-ad-image {
      max-width: 100%;
      max-height: 60vh;
      width: auto;
      height: auto;
      object-fit: contain;
      border-radius: 10px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    
    .custom-ad-image.clickable {
      cursor: pointer;
    }
    
    .custom-ad-image.clickable:hover {
      transform: scale(1.02);
      box-shadow: 0 6px 12px rgba(0, 0, 0, 0.4);
    }
    
    .custom-ad-image.clickable:active {
      transform: scale(0.98);
    }
    
    .custom-ad-code-wrapper {
      width: 100%;
      margin: 20px 0;
      padding: 0;
      background: transparent;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    
    .custom-ad-code-label {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: rgba(255, 255, 255, 0.9);
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    
    .light-mode .custom-ad-code-label {
      color: rgba(0, 0, 0, 0.8);
    }
    
    .code-icon {
      font-size: 18px;
      color: #ffd700;
    }
    
    .custom-ad-code-container {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      width: 100%;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%);
      backdrop-filter: blur(10px);
      border-radius: 16px;
      padding: 16px 20px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 
                  inset 0 1px 0 rgba(255, 255, 255, 0.1);
      transition: all 0.3s ease;
    }
    
    .light-mode .custom-ad-code-container {
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
      border: 1px solid rgba(0, 0, 0, 0.1);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1), 
                  inset 0 1px 0 rgba(255, 255, 255, 0.5);
    }
    
    .custom-ad-code-container:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4), 
                  inset 0 1px 0 rgba(255, 255, 255, 0.15);
    }
    
    .light-mode .custom-ad-code-container:hover {
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15), 
                  inset 0 1px 0 rgba(255, 255, 255, 0.6);
    }
    
    .custom-ad-code-display {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .custom-ad-code-highlight {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px 24px;
      border-radius: 12px;
      display: inline-block;
      font-size: 28px;
      font-weight: 800;
      letter-spacing: 2px;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4),
                  0 2px 4px rgba(0, 0, 0, 0.2),
                  inset 0 1px 0 rgba(255, 255, 255, 0.2);
      position: relative;
      overflow: hidden;
    }
    
    .custom-ad-code-highlight::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
      animation: shine 3s infinite;
    }
    
    @keyframes shine {
      0% { left: -100%; }
      100% { left: 100%; }
    }
    
    .custom-ad-copy-button {
      --background: rgba(255, 255, 255, 0.15);
      --color: white;
      --border-radius: 12px;
      --border-width: 0;
      --border-color: transparent;
      --padding-start: 16px;
      --padding-end: 16px;
      --padding-top: 16px;
      --padding-bottom: 16px;
      width: 56px;
      height: 56px;
      margin: 0;
      backdrop-filter: blur(10px);
      border: none;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2),
                  inset 0 1px 0 rgba(255, 255, 255, 0.1);
      transition: all 0.3s ease;
    }
    
    .light-mode .custom-ad-copy-button {
      --background: rgba(0, 0, 0, 0.05);
      --color: #000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1),
                  inset 0 1px 0 rgba(255, 255, 255, 0.5);
    }
    
    .custom-ad-copy-button ion-icon {
      font-size: 24px;
    }
    
    .custom-ad-copy-button.ion-activated {
      --background: rgba(102, 126, 234, 0.4);
      transform: scale(0.95);
    }
    
    .light-mode .custom-ad-copy-button.ion-activated {
      --background: rgba(102, 126, 234, 0.3);
    }
    
    .custom-ad-copy-button:hover {
      --background: rgba(255, 255, 255, 0.25);
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3),
                  inset 0 1px 0 rgba(255, 255, 255, 0.15);
    }
    
    .light-mode .custom-ad-copy-button:hover {
      --background: rgba(0, 0, 0, 0.1);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15),
                  inset 0 1px 0 rgba(255, 255, 255, 0.6);
    }
    
    .custom-ad-button-wrapper {
      width: 100%;
      display: flex;
      justify-content: center;
      padding: 0 20px;
      margin-top: auto;
    }
    
    .custom-ad-button {
      max-width: 80%;
      min-width: 200px;
      --border-radius: 25px;
      --padding-top: 12px;
      --padding-bottom: 12px;
      font-weight: bold;
      font-size: 16px;
    }
    
    .light-mode .custom-ad-button {
      --color: white;
    }
    
    ion-header {
      --background: transparent;
    }
    
    ion-toolbar {
      --background: transparent;
    }
    
    .dark-mode ion-toolbar {
      --color: white;
    }
    
    .light-mode ion-toolbar {
      --color: black;
    }
    
    .dark-mode ion-button[fill="clear"] {
      --color: white;
    }
    
    .light-mode ion-button[fill="clear"] {
      --color: black;
    }
  `]
})
export class CustomAdModalComponent {
  @Input() adData: any;
  @Input() isDarkMode: boolean = false;
  isCopied: boolean = false;

  constructor(
    private modalController: ModalController,
    private sanitizer: DomSanitizer
  ) {}

  sanitizeHtml(html: string): SafeHtml {
    if (!html) return '';
    // Use bypassSecurityTrustHtml to allow HTML tags in title and description
    // This allows common HTML tags like <b>, <i>, <strong>, <em>, <br>, <p>, <span>, etc.
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  dismiss() {
    this.modalController.dismiss();
  }

  async openLink() {
    if (this.adData?.buttonLink) {
      // Track click
      await this.trackClick();
      
      // Use appropriate method based on platform
      if (Capacitor.isNativePlatform()) {
        // For iOS/Android native apps, use location.href to open in system browser
        // This is the most reliable method for Capacitor apps
        window.location.href = this.adData.buttonLink;
      } else {
        // For web platform, use window.open
        window.open(this.adData.buttonLink, '_blank');
      }
      
      this.dismiss();
    }
  }

  async trackClick() {
    try {
      // Check for custom_ad_id in local storage
      const storedId = await Preferences.get({ key: 'custom_ad_id' });
      let uniqueId: string;

      if (!storedId.value) {
        // Generate unique ID: AD + DDMMYYYYhhmmss
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        
        uniqueId = `AD${day}${month}${year}${hours}${minutes}${seconds}`;
        
        // Store the ID in local storage
        await Preferences.set({
          key: 'custom_ad_id',
          value: uniqueId
        });
      } else {
        uniqueId = storedId.value;
      }

      // Log/increment click count in Firebase
      const db = getDatabase();
      const clickRef = ref(db, `custom_ad_clicks/${uniqueId}`);
      
      // Get current count
      const snapshot = await get(clickRef);
      if (snapshot.exists()) {
        // Increment existing count
        const currentCount = snapshot.val() || 0;
        await set(clickRef, currentCount + 1);
      } else {
        // Initialize with count 1
        await set(clickRef, 1);
      }
    } catch (error) {
      console.error('Error tracking click:', error);
    }
  }

  onImageError() {
    console.error('Failed to load custom ad image');
  }

  onImageClick() {
    // Only navigate if button is enabled and link exists
    if (this.adData?.showButton && this.adData?.buttonLink) {
      this.openLink();
    }
  }

  async copyToClipboard() {
    if (!this.adData?.promoCode) return;

    try {
      // Use Clipboard API if available
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(this.adData.promoCode);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = this.adData.promoCode;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }

      // Show success feedback
      this.isCopied = true;
      setTimeout(() => {
        this.isCopied = false;
      }, 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      // Still show feedback even if copy fails
      this.isCopied = true;
      setTimeout(() => {
        this.isCopied = false;
      }, 2000);
    }
  }
}

