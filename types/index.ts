export type Role = 'admin' | 'member'
export type Period = '1 Month' | '3 Months' | '6 Months' | '1 Year'
export type SubStatus = 'active' | 'expired' | 'cancelled' | 'pending'
export type PaymentMethod = 'InstaPay' | 'Vodafone Cash' | 'Binance Pay' | 'Bybit' | 'BEP20' | 'PayPal' | 'Cash' | 'Other'

export interface Profile { id:string; full_name:string; role:Role }
export interface Product { id:string; name:string; color:string; icon:string; is_active:boolean }
export interface MyAccount { id:string; product_id:string; email:string; password:string; edu_account?:string; total_slots:number; used_slots:number; notes?:string; expires_at?:string }
export interface Customer { id:string; full_name:string; phone?:string; email?:string; telegram?:string; notes?:string; created_at:string }
export interface Subscription { id:string; customer_id:string; product_id:string; account_id?:string; period:Period; amount_egp:number; payment_method:PaymentMethod; start_date:string; end_date:string; status:SubStatus; notes?:string; created_at:string }
export interface SubscriptionFull extends Subscription { customer_name:string; product_name:string; product_color:string; account_email?:string; days_remaining:number }
export interface Transaction { id:string; type:'income'|'expense'; amount_egp:number; description?:string; product_id?:string; payment_method?:string; transaction_date:string }
export interface DashboardKPIs { active_count:number; expired_count:number; expiring_7d:number; total_customers:number; revenue_this_month:number; expenses_this_month:number }
