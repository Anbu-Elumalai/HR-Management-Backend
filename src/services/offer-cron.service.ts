import cron from 'node-cron';
import { AppDataSource } from '../data-source';
import { Offer } from '../entity/Offer';
import { OfferStatus } from '../dto/admin/Offer.dto';
import { LessThan, Not } from 'typeorm';

export class OfferCronService {
    private isInitialized = false;

    async initialize() {
        if (this.isInitialized) {
            return;
        }

        try {
            // Wait for database to be ready
            if (!AppDataSource.isInitialized) {
                await AppDataSource.initialize();
            }

            // Schedule cron job to run daily at 10:00 AM
            // Cron expression: minute hour day-of-month month day-of-week
            // '0 10 * * *' means at 10:00 AM every day
            cron.schedule('0 10 * * *', async () => {
                await this.checkAndExpireOffers();
            });

            this.isInitialized = true;
            console.log('✅ Offer cron job scheduled: Daily at 10:00 AM');
        } catch (error) {
            console.error('❌ Failed to initialize offer cron service:', error);
        }
    }

    async checkAndExpireOffers() {
        try {
            const offerRepo = AppDataSource.getMongoRepository(Offer);
            const now = new Date();

            console.log(`[Offer Cron] Starting expiry check at ${now.toISOString()}`);

            // Find offers that have expired but are not yet marked as expired
            // Conditions:
            // - offerExpiryDate is in the past
            // - isActive = 1
            // - isDelete = 0
            // - status is not in final states (Expired, Accepted, Rejected, Cancelled)
            const expiredOffers = await offerRepo.find({
                where: {
                    offerExpiryDate: { $lt: now },
                    isActive: 1,
                    isDelete: 0,
                    status: { $nin: [OfferStatus.EXPIRED, OfferStatus.ACCEPTED, OfferStatus.REJECTED, OfferStatus.CANCELLED] }
                }
            });

            if (expiredOffers.length === 0) {
                console.log('[Offer Cron] No expired offers found.');
                return;
            }

            console.log(`[Offer Cron] Found ${expiredOffers.length} expired offers to update.`);

            // Update all expired offers
            const expiredOfferIds = expiredOffers.map(offer => offer.id);

            const updateResult: any = await offerRepo.update(
                expiredOfferIds,
                {
                    status: OfferStatus.EXPIRED
                }
            );

            console.log(`[Offer Cron] Updated ${updateResult.affected} offers to EXPIRED status.`);

            // Optional: Log the updated offer IDs for audit
            if (updateResult?.affected > 0) {
                const updatedOffers = await offerRepo.find({
                    where: {
                        status: OfferStatus.EXPIRED,
                        updatedAt: { $gte: now }
                    },
                    select: ['id', 'offerCode', 'status', 'offerExpiryDate']
                });
                console.log('[Offer Cron] Updated offers:', updatedOffers.map(o => o.offerCode));
            }

        } catch (error) {
            console.error('[Offer Cron] Error checking and expiring offers:', error);
        }
    }

    // For manual testing - can be called via an API endpoint or manually
    async runManually() {
        console.log('[Offer Cron] Manual trigger started');
        await this.checkAndExpireOffers();
        console.log('[Offer Cron] Manual trigger completed');
    }
}

export const offerCronService = new OfferCronService();
