# Great Britain Power Market Trading Methodology & Imbalance Risk Mathematics

## 1. Wholesale Power Market Context

In Great Britain (GB), wholesale electricity is traded across bilateral contracts, power exchanges (EPEX Spot and Nord Pool), and within the National Grid ESO Balancing Mechanism (BM).

### 1.1 The Day-Ahead Auction Window
Electricity delivery is divided into 48 half-hour **Settlement Periods** each day. Bidding for Day $D$ occurs on Day $D-1$:
* **Nord Pool Day-Ahead Auction:** Clears at 09:50 UK Time.
* **EPEX Spot Day-Ahead Auction:** Clears at 11:00 UK Time.
* **Operational Gate Closure:** Typically established by procurement trading desks between 09:00 and 11:00 on $D-1$.

### 1.2 The Imbalance Penalty Mechanism
Any discrepancy between contracted position and metered physical generation is subject to the **System Price (Cashout Price)**:
* If a utility generates less than its committed auction volume (short position), it must buy power at the **System Buy Price (SBP)**, which escalates during tight system margins (often exceeding £150–£300/MWh).
* To mitigate punitive cashout exposure, traders must formulate a conservative firm commitment and procure a flexible thermal or interconnector hedge buffer for the downside forecast uncertainty.

---

## 2. Decision Cutoff Engine (Zero Look-Ahead Leakage)

### 2.1 The Academic vs Operational Divergence
Most academic evaluations pair delivery periods with the latest forecast published right before delivery (e.g. 1 hour prior). However, for day-ahead auctions, traders **only have access to forecasts published on or before the auction gate closure on $D-1$**.

Using forecasts published at 22:00 on $D-1$ to evaluate a bid placed at 10:30 on $D-1$ introduces severe look-ahead data leakage.

### 2.2 Algorithmic Implementation
For a target delivery date $D$ and cutoff time $T_{\text{cutoff}}$ (e.g., 09:00 Europe/London):
1. Compute cutoff timestamp $t_{\text{cutoff}} = (D - 1\text{ day}) \text{ at } T_{\text{cutoff}}$ converted to UTC.
2. Filter candidate forecast vintages:
   $$\mathcal{F}_{\text{valid}} = \{f \in \mathcal{F} \mid f.\text{target\_time} \in \text{Day } D \land f.\text{publish\_time} \le t_{\text{cutoff}}\}$$
3. For each settlement period $p \in \{1 \dots 48\}$:
   $$\hat{y}_p = \arg\max_{f \in \mathcal{F}_{\text{valid}, p}} (f.\text{publish\_time})$$

---

## 3. Leave-One-Day-Out (LODO) Risk Buffer Formulation

### 3.1 Motivation
If empirical error quantiles were fitted including delivery day $D$, the model would "peek" into the target day's weather regime. To ensure institutional rigor, the portal establishes confidence bounds using **Leave-One-Day-Out (LODO) cross-validation**.

### 3.2 Formulation
Let $e_t = y_t - \hat{y}_t$ be the signed error (actual minus forecast):
* Negative error ($e_t < 0$) indicates wind shortfall.
* For delivery day $D$, training observations are restricted to:
  $$\mathcal{T}_D = \{t \mid \text{Date}(t) \in \text{January 2026} \setminus \{D\}\}$$
* The downside empirical quantile $e_{P10}$ is calculated for each settlement period:
  $$P(\text{Error} \le e_{P10}) = 0.10$$
* Since $e_{P10} < 0$, the recommended hedge buffer is:
  $$\text{Recommended Risk Buffer (MW)} = |e_{P10}|$$
* The firm wind bid submitted to the exchange is:
  $$\text{Firm Wind Bid (MW)} = \max(0, \hat{y}_t + e_{P10})$$
* Financial Imbalance Exposure is computed using a benchmark £85/MWh cashout spread proxy:
  $$\text{Financial Risk Exposure (£)} = \text{Buffer (MW)} \times 0.5\text{ h} \times \text{£85/MWh}$$

---

## 4. Standard Accuracy Metrics

1. **Signed Error ($e_t$):**
   $$e_t = y_t - \hat{y}_t$$
2. **Mean Absolute Error (MAE):**
   $$\text{MAE} = \frac{1}{N} \sum_{t=1}^N |y_t - \hat{y}_t|$$
3. **Root Mean Squared Error (RMSE):**
   $$\text{RMSE} = \sqrt{\frac{1}{N} \sum_{t=1}^N (y_t - \hat{y}_t)^2}$$
4. **Mean Bias Error (MBE):**
   $$\text{Bias} = \frac{1}{N} \sum_{t=1}^N (y_t - \hat{y}_t)$$
5. **Normalized MAE (nMAE):**
   $$\text{nMAE} = \frac{\text{MAE}}{\bar{y}} \quad \text{where } \bar{y} = \frac{1}{N}\sum_{t=1}^N y_t$$
6. **Mean Absolute Percentage Error (MAPE with Capacity Floor):**
   $$\text{MAPE} = \frac{1}{|T_{\ge 100}|} \sum_{t \in T_{\ge 100}} \frac{|y_t - \hat{y}_t|}{y_t} \times 100\%$$
