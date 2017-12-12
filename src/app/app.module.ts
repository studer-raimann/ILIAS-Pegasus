import {NgModule, ErrorHandler} from '@angular/core';
import {IonicApp, IonicModule, IonicErrorHandler} from 'ionic-angular';
import { MyApp } from './app.component';
import {HttpModule, Http} from '@angular/http';
import {ConnectionService} from "../services/ilias-app.service";
import {ILIASRestProvider} from "../providers/ilias-rest.provider";
import {MigrationsService} from "../services/migrations.service";
import {FooterToolbarService} from "../services/footer-toolbar.service";
import {FileService} from "../services/file.service";
import {DataProvider} from "../providers/data-provider.provider";
import {ObjectListPage} from "../pages/object-list/object-list";
import {FavoritesPage} from "../pages/favorites/favorites";
import {NewObjectsPage} from "../pages/new-objects/new-objects";
import {SettingsPage} from "../pages/settings/settings";
import {InfoPage} from "../pages/info/info";
import {MapPage} from "../learnplace/pages/map/map.component";
import {SynchronizationService} from "../services/synchronization.service";
import {DataProviderFileObjectHandler} from "../providers/handlers/file-object-handler";
import {FileSizePipe} from "../pipes/fileSize.pipe";
import {TranslateModule} from 'ng2-translate/ng2-translate';
import {TranslateLoader} from "ng2-translate/src/translate.service";
import {TranslateStaticLoader} from "ng2-translate/src/translate.service";
import {ObjectDetailsPage} from "../pages/object-details/object-details";
import {LoginPage} from "../pages/login/login";
import {ModalPage} from "../pages/modal/modal";
import {SyncFinishedModal} from "../pages/sync-finished-modal/sync-finished-modal";
import {TokenUrlConverter} from "../services/url-converter.service";
import {BrowserModule} from "@angular/platform-browser";
import {InAppBrowser} from "@ionic-native/in-app-browser";
import {StatusBar} from "@ionic-native/status-bar";
import {FileTransfer} from "@ionic-native/file-transfer";
import {Network} from "@ionic-native/network";
import {File} from "@ionic-native/file";
import {SQLite} from "@ionic-native/sqlite";
import {Toast} from "@ionic-native/toast";
import {HttpILIASConfigFactory, ILIAS_CONFIG_FACTORY} from "../services/ilias-config-factory";
import {TabsPage} from "../learnplace/pages/tabs/tabs.component";


export function createTranslateLoader(http: Http) {
  return new TranslateStaticLoader(http, './assets/i18n', '.json');
}

@NgModule({
  declarations: [
    MyApp,
    ObjectListPage,
    FavoritesPage,
    NewObjectsPage,
    SettingsPage,
    InfoPage,
    ObjectDetailsPage,
    LoginPage,
    FileSizePipe,
    SyncFinishedModal,
    ModalPage,
    MapPage,
    TabsPage
  ],
  imports: [
    IonicModule.forRoot(MyApp),
    BrowserModule,
    HttpModule,
    TranslateModule.forRoot({
      provide: TranslateLoader,
      useFactory: (createTranslateLoader),
      deps: [Http]
    })
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    MyApp,
    ObjectListPage,
    FavoritesPage,
    NewObjectsPage,
    SettingsPage,
    InfoPage,
    ObjectDetailsPage,
    LoginPage,
    SyncFinishedModal,
    MapPage,
    TabsPage
  ],
  providers: [
    {
      provide: ILIAS_CONFIG_FACTORY,
      useClass: HttpILIASConfigFactory
    },
    ConnectionService,
    MigrationsService,
    ILIASRestProvider,
    FooterToolbarService,
    DataProvider,
    FileService,
    SynchronizationService,
    DataProviderFileObjectHandler,
    TokenUrlConverter,
    StatusBar,
    InAppBrowser,
    File,
    FileTransfer,
    Network,
    SQLite,
    Toast,
    {provide: ErrorHandler, useClass: IonicErrorHandler}
  ],
  exports: [
    TranslateModule
  ]
})
export class AppModule {}
