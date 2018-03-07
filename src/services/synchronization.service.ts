import {Inject, Injectable} from "@angular/core";
import {ILIASObject} from "../models/ilias-object";
import {DataProvider} from "../providers/data-provider.provider";
import {User} from "../models/user";
import {SQLiteDatabaseService} from "./database.service";
import {FileService} from "./file.service";
import {Events} from "ionic-angular";
import {FooterToolbarService, Job} from "./footer-toolbar.service";
import { TranslateService } from "ng2-translate/src/translate.service";
import {Log} from "./log.service";
import {FileData} from "../models/file-data";
import {NEWS_SYNCHRONIZATION, NewsSynchronization} from "./news/news.synchronization";
import {
  VISIT_JOURNAL_SYNCHRONIZATION,
  VisitJournalSynchronization
} from "../learnplace/services/visitjournal.synchronize";

@Injectable()
export class SynchronizationService {

    private user: User;


    private syncQueue: Array<{ object: ILIASObject, resolver: Resolve<SyncResults>, rejecter }> = [];

    lastSync: Date;
    lastSyncString: string;

    private _isRunning: boolean = false;

    constructor(private readonly dataProvider: DataProvider,
                private readonly events: Events,
                private readonly fileService: FileService,
                private readonly footerToolbar: FooterToolbarService,
                private readonly translate: TranslateService,
                @Inject(NEWS_SYNCHRONIZATION) private readonly newsSynchronization: NewsSynchronization,
                @Inject(VISIT_JOURNAL_SYNCHRONIZATION) private readonly visitJournalSynchronization: VisitJournalSynchronization
    ) {}

    /**
     * Execute synchronization
     * If iliasObject is null, executes a global sync (data is fetched for all objects marked as offline available)
     * If iliasObject is given, only fetches data for the given object
     * @param iliasObject
     * @returns {any}
     */
    execute(iliasObject: ILIASObject = undefined): Promise<SyncResults> {
        Log.write(this, "Sync started!");
        if (this._isRunning && iliasObject == undefined) {
            return Promise.reject(this.translate.instant("actions.sync_already_running"));
        } else if(this._isRunning) {
            let resolver;
            let rejecter;
            const promise: Promise<SyncResults> = new Promise((resolve, reject) => {
                resolver = resolve;
                rejecter = reject;
            });
            this.syncQueue.push({
                object: iliasObject,
                resolver: resolver,
                rejecter: rejecter
            });
            return promise;
        }

        this.events.publish("sync:start");

        return User.currentUser()
            .then(user => {
                this.user = user;
                return this.syncStarted(this.user.id);
            })
            .then( () => {
                if(iliasObject) {
                    return this.executeContainerSync(iliasObject);
                } else {
                	// console.log('executeGlobalSync');
                    return this.executeGlobalSync();
                }
            }).then((syncResult) => {
                if(this.syncQueue.length > 0) {
                    const sync = this.syncQueue.pop();
                    this.execute(sync.object)
                        .then((syncResult: SyncResults) => {
                            sync.resolver(syncResult);
                        }).catch(error => {
                            sync.rejecter(error);
                    });
                }
                return Promise.resolve(syncResult);
            })
            .catch( (error) => {
                // we catch any occuring errors in the process so we can turn off the sync status. then we delegate for any view to be able to recatch the exception.
                this.syncEnded(this.user.id);
                return Promise.reject(error);
            });
    }

    get isRunning() {
        return this._isRunning;
    }

    /**
     * set local isRunning and db entry that a sync is in progress
     */
    protected syncStarted(user_id: number): Promise<any> {
        return new Promise((resolve, reject) => {
            this.footerToolbar.addJob(Job.Synchronize, this.translate.instant("synchronisation_in_progress"));
            this._isRunning = true;
            SQLiteDatabaseService.instance().then(db => {
                db.query("INSERT INTO synchronization (userId, startDate, endDate, isRunning) VALUES (" + user_id + ", date('now'), NULL, 1)").then(() => {
                    resolve();
                }).catch(err => {
                    Log.error(this, err);
                    reject();
                });
            });
        });
    }

    /**
     * set local isRunning and closes the db entry that a sync is in progress
     */
    protected syncEnded(user_id: number): Promise<any> {
            this.footerToolbar.removeJob(Job.Synchronize);
            this._isRunning = false;
            Log.write(this, "ending Sync.");
            return SQLiteDatabaseService.instance()
                .then(db => {
					// let now = new Date();
					// let datestring = now.getFullYear()+"-"+(now.getMonth()+1)+"-"+now.getDate()+" "+("0"+now.getHours()).substr(-2) + ":" + ("0"+now.getMinutes()).substr(-2)+":00";
					// db.query("UPDATE synchronization SET isRunning = 0, endDate = '"+datestring+"' WHERE userId = " + user_id + " AND isRunning = 1")
					db.query("UPDATE synchronization SET isRunning = 0, endDate = date('now') WHERE userId = " + user_id + " AND isRunning = 1")
				})
                .then(() => this.updateLastSync(user_id));
    }

    updateLastSync(user_id: number){
        return SQLiteDatabaseService.instance()
            .then(db => db.query("SELECT endDate FROM synchronization WHERE userId = " + user_id + " AND endDate not Null ORDER BY endDate DESC LIMIT 1"))
            .then((result) => {
                if(result.rows.length == 0)
                    return Promise.resolve(null);
                Log.describe(this, "last sync: ", new Date(result.rows.item(0).endDate));
				const now = new Date();
				this.lastSync = new Date(result.rows.item(0).endDate);
				// this.lastSync.setTime(this.lastSync.getTime() - now.getTimezoneOffset()*60*1000);

				let date_string = "";
				if (now.getMonth() == this.lastSync.getMonth() && now.getFullYear() == this.lastSync.getFullYear()) {
					if (now.getDate() == this.lastSync.getDate()) {
						date_string = this.translate.instant("today");
					} else if ((now.getDate() - 1) == this.lastSync.getDate()) {
						date_string = this.translate.instant("yesterday");
					}
				}

				date_string = date_string ? date_string : this.lastSync.getDate()+"."+(this.lastSync.getMonth()+1)+"."+this.lastSync.getFullYear();

                // this.lastSyncString = date_string +", "+("0"+this.lastSync.getHours()).substr(-2) + ":" + ("0"+this.lastSync.getMinutes()).substr(-2);
                this.lastSyncString = date_string;
                Log.describe(this, "lastdate", this.lastSync);
                return Promise.resolve(this.lastSync);
            });
    }


    /**
     * check if the user still has a running sync in the db.
     */
    hasUnfinishedSync(user: User): Promise<boolean> {
        if(!user)
            return Promise.reject("No user given.");

        return SQLiteDatabaseService.instance()
                .then(db => db.query("SELECT * FROM synchronization WHERE isRunning = 1 AND userId = " + user.id))
                .then(result => Promise.resolve((<any> result).rows.length > 0));
    }

    /**
     * Get all objects marked as offline available by the user
     * @param user
     * @returns {Promise<ILIASObject[]>}
     */
    protected getOfflineAvailableObjects(user: User): Promise<Array<ILIASObject>> {
        const sql = "SELECT * FROM objects WHERE userId = ? AND isOfflineAvailable = 1 AND offlineAvailableOwner = ?";

        return SQLiteDatabaseService.instance()
            .then(db => db.query(sql, [user.id, ILIASObject.OFFLINE_OWNER_USER]))
            .then((response: any) => {
                    const iliasObjectPromises = [];
                    for (let i = 0; i < response.rows.length; i++) {
                        iliasObjectPromises.push(ILIASObject.find(response.rows.item(i).id));
                    }

                    return Promise.all(iliasObjectPromises);
            });
    }

    /**
     * Finds all files that should be downloaded. Also performs checks if these files can be downloaded based
     * on the user's settings
     * @param iliasObjects
     */
    protected checkForFileDownloads(iliasObjects: Array<ILIASObject>): Promise<SyncResults> {
        return new Promise((resolve: Resolve<SyncResults>, reject: Reject<Error>) => {
            this.user.settings.then(settings => {
                FileData.getTotalDiskSpace().then(space => {

                    // We split the objects in different categories.
                    const downloads: Array<ILIASObject> = [];
                    const filesTooBig: Array<{ object: ILIASObject, reason: LeftOutReason}> = [];
                    const noMoreSpace: Array<{ object: ILIASObject, reason: LeftOutReason}> = [];
                    const filesAlreadySynced: Array<ILIASObject> = [];

                    // Furthermore we need some infos
                    const availableSpace: number = settings.quotaSize * 1000 * 1000;
                    let currentlyUsedSpace: number = space;

                    // make sure to only sync files.
                    const fileObjects = iliasObjects.filter(iliasObject => {
                        return iliasObject.type == "file";
                    });

                    // We sort all objects to know which to download and which to leave out.
                    fileObjects.forEach(fileObject => {
                        if (fileObject.needsDownload) {
                            const fileSize = parseInt(fileObject.data.fileSize);
                            if (currentlyUsedSpace + fileSize <= availableSpace) {
                                if (fileSize <= settings.downloadSize * 1000 * 1000) {
                                    downloads.push(fileObject);
                                    currentlyUsedSpace += fileSize;
                                } else {
                                    filesTooBig.push({object: fileObject, reason: LeftOutReason.FileTooBig});
                                }
                            } else {
                                noMoreSpace.push({object: fileObject, reason: LeftOutReason.QuotaExceeded});
                            }
                        } else {
                            filesAlreadySynced.push(fileObject);
                        }
                    });

                    // We make a copy of the files to download, as the list gets decreased in the download process
                    const totalDownloads = downloads.length;
                    const allDownloads = downloads.slice(0); // This is the javascript's clone function....

                    // We set the job to downloading and add a listener to track the progress.
                    this.footerToolbar.addJob(Job.FileDownload, `${this.translate.instant("sync.download")} 0/${totalDownloads}`);
                    const progressListener = (outstandingDownloads: number) => {
                        this.footerToolbar.addJob(Job.FileDownload, this.translate.instant("sync.download") + " " + (totalDownloads - outstandingDownloads) + "/" + totalDownloads);
                    };

                    // we execute the file downloads and afterwards
                    this.executeFileDownloads(downloads, progressListener).then(() => {
                        this.footerToolbar.removeJob(Job.FileDownload);
                        resolve(new SyncResults(
                            fileObjects,
                            allDownloads,
                            filesAlreadySynced,
                            filesTooBig.concat(noMoreSpace)
                        ));
                    }).catch(error => {
                        Log.describe(this, "Execute File Download rejected", error);
                        this.footerToolbar.removeJob(Job.FileDownload);
                        reject(error);
                    });
                }).catch((error) => {
                    reject(error);
                });
            });
        });
    }

    /**
     * Downloads one file after another
     */
    protected executeFileDownloads(downloads: Array<ILIASObject>, progressListener?: (outstanding_downloads: number) => void): Promise<any> {
        return new Promise((resolve, reject) => {
            if (downloads.length == 0) {
                resolve();
            } else {
                const download = downloads.pop();
                if (progressListener != undefined)
                    progressListener(downloads.length);
                this.fileService.download(download).then(() => {
                    this.executeFileDownloads(downloads, progressListener).then(() => {
                        resolve();
                    });
                }).catch(error => {
                    downloads.push(download);
                    reject(error);
                });
            }
        });
    }

    private async executeContainerSync(container: ILIASObject): Promise<SyncResults> {
        await this.newsSynchronization.synchronize();
        await this.visitJournalSynchronization.synchronize();
        return this.dataProvider.getObjectData(container, this.user, true)
            .then( (iliasObjects) => {
                iliasObjects.push(container);
                return this.checkForFileDownloads(iliasObjects);

            })
            .then( (syncResults) =>
                this.syncEnded(this.user.id).then( () => Promise.resolve(syncResults))
            );
    }

    private async executeGlobalSync(fetchAllMetaData: boolean = true): Promise<SyncResults> {
        // Run sync for all objects marked as "offline available"
        Log.write(this, "Fetching offline available objects.");

        try {
          this.footerToolbar.addJob(Job.MetaDataFetch, this.translate.instant("sync.fetching_news"));
          await this.newsSynchronization.synchronize();
          await this.visitJournalSynchronization.synchronize();
        }
        finally {
          this.footerToolbar.removeJob(Job.MetaDataFetch);
        }


        return this.dataProvider.getDesktopData(this.user)
            .then(desktopObjects => {
				        this.footerToolbar.addJob(Job.MetaDataFetch, this.translate.instant("sync.fetching_metadata"));
                let promises = Promise.resolve();
                for (const iliasObject of desktopObjects) {
                    promises = promises.then(() => {
                        this.footerToolbar.addJob(Job.MetaDataFetch, this.translate.instant("sync.fetching_metadata") + ": " + iliasObject.title);
                        Log.write(this, `Fetching offline available objects for ${iliasObject.title}`);
                       return this.dataProvider.getObjectData(iliasObject, this.user, true);
                    }).then(() => {
                        Log.write(this, "Fetching finished.")
                    });
                }
                return promises;
            })
            .catch(error => {
                this.footerToolbar.removeJob(Job.MetaDataFetch);
                return Promise.reject(error);
            })
            .then( () => {
                Log.write(this, "Fetching metadata finished.");
                this.footerToolbar.removeJob(Job.MetaDataFetch);
                return this.getOfflineAvailableObjects(this.user)
            })
            .then(offlineAvailableObjects => {
                const promises = [];
                for (const iliasObject of offlineAvailableObjects) {
                    promises.push(ILIASObject.findByParentRefIdRecursive(iliasObject.refId, this.user.id));
                }
                promises.push(Promise.resolve(offlineAvailableObjects));

                return Promise.all(promises);
            })
            .then((listOfIliasObjectLists) => {
                let iliasObjects = [];
                listOfIliasObjectLists.forEach(list => {
                    iliasObjects = iliasObjects.concat(list);
                });

                return this.checkForFileDownloads(iliasObjects);
            }).then((syncResults) =>
                this.syncEnded(this.user.id).then( () => Promise.resolve(syncResults) )
            );
    }
}

export class SyncResults {
    constructor(public totalObjects: Array<ILIASObject>,
                public objectsDownloaded: Array<ILIASObject>,
                public objectsUnchanged: Array<ILIASObject>,
                public objectsLeftOut: Array<{object: ILIASObject, reason: LeftOutReason}>) {
    }
}

/**
 * WARNING at the moment we only use FileTooBig, the other two reasons lead to an abortion of the sync!
 */
export enum LeftOutReason {
    // In most cases you don't want to download files if you're not in the wlan.
    NoWLAN = 1,
    // In the settings you can specify how big files should be you want to download.
    FileTooBig = 2,
    // In the settings you can set a max quota.
    QuotaExceeded = 3
}
