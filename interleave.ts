// 募集インターフェース
//タイトル、会社、スコア（今回は便宜上ソート時に使用）
interface Recruitment {
  id: number;
  title: string;
  company: string;
  score: number;
}
// 新旧ランキングアルゴリズムインターフェース
interface RankingAlgorithm {
  name: string;
  rank(recruitments: Recruitment[]): Recruitment[];
}

// インターリービング結果インターフェース
interface InterleavingResult {
  interleavedRecruitments: Recruitment[];
  sourceMap: ("old" | "new")[];
  clicks: { [recruitmentId: number]: string };
}

// ページネーション結果インターフェース
interface PaginationResult {
  items: Recruitment[];
  sourceMap: ("old" | "new")[];
  totalPages: number;
  currentPage: number;
  perPage: number;
  totalItems: number;
}

/**
 * 旧ランキングアルゴリズム（適当なソートで返す）
 */
class OldRankingAlgorithm implements RankingAlgorithm {
  name = "old";
  // 単純な降順
  rank(recruitments: Recruitment[]): Recruitment[] {
    return [...recruitments].sort((a, b) => b.score - a.score);
  }
}

/**
 * 新ランキングアルゴリズム（適当なソートで返す）
 */
class NewRankingAlgorithm implements RankingAlgorithm {
  name = "new";

  rank(recruitments: Recruitment[]): Recruitment[] {
    // スコアとタイトルの長さで重み付けをし降順
    return [...recruitments].sort((a, b) => {
      const scoreA = a.score * 0.8 + a.title.length * 0.2;
      const scoreB = b.score * 0.8 + b.title.length * 0.2;
      return scoreB - scoreA;
    });
  }
}

/**
 * Balanced Interleaving
 *
 * フロー：
 * 新旧ランキングアルゴリズム結果のインターリーブ
 * インターリーブ結果からページネーションを適用する
 * ユーザーがクリックした募集を記録
 * 現在の評価結果を分析して、どちらのアルゴリズムが優れているかを判定
 */
class BalancedInterleaving {
  private oldAlgorithm: RankingAlgorithm;
  private newAlgorithm: RankingAlgorithm;
  private interleavingResult: InterleavingResult | null = null;
  private cachedFilterKey: string = ""; // フィルタリングパラメータのキャッシュキー

  constructor(oldAlgorithm: RankingAlgorithm, newAlgorithm: RankingAlgorithm) {
    this.oldAlgorithm = oldAlgorithm;
    this.newAlgorithm = newAlgorithm;
  }

  /**
   * 新旧ランキングアルゴリズム結果のインターリーブ
   * @param recruitments 全ての募集データ
   * @param filterKey フィルタリングパラメータに基づくキャッシュキー
   * @returns インターリーブ結果
   */
  interleave(
    recruitments: Recruitment[],
    filterKey: string = ""
  ): InterleavingResult {
    // 同じフィルタ条件で既にインターリーブ結果がある場合はそれを返す
    if (this.interleavingResult && this.cachedFilterKey === filterKey) {
      return this.interleavingResult;
    }

    const oldRanked = this.oldAlgorithm.rank(recruitments);
    const newRanked = this.newAlgorithm.rank(recruitments);

    // インターリーブ結果
    const interleavedRecruitments: Recruitment[] = [];
    const sourceMap: ("old" | "new")[] = [];

    // 重複を防ぐためのセット
    const addedIds = new Set<number>();

    // 公平にインターリーブするためのフラグ（どちらが先に追加されるか）
    let startWithOld = Math.random() < 0.5;

    // インターリーブ処理を行うポインタ
    let oldIndex = 0;
    let newIndex = 0;

    // 両方のリストを消費するまで繰り返す
    while (oldIndex < oldRanked.length || newIndex < newRanked.length) {
      // 次に追加するアルゴリズム
      const nextIsOld = startWithOld
        ? oldIndex < oldRanked.length
        : newIndex >= newRanked.length;
        //以下、L105と重複しているため不要
        /*|| (oldIndex < oldRanked.length && Math.random() < 0.5)*/

      if (nextIsOld) {
        // 旧アルゴリズムから未追加の募集を取得
        while (oldIndex < oldRanked.length) {
          const recruitment = oldRanked[oldIndex++];
          if (!addedIds.has(recruitment.id)) {
            interleavedRecruitments.push(recruitment);
            sourceMap.push("old");
            addedIds.add(recruitment.id);
            break;
          }
        }
      } else {
        // 新アルゴリズムから未追加の募集を取得
        while (newIndex < newRanked.length) {
          const recruitment = newRanked[newIndex++];
          if (!addedIds.has(recruitment.id)) {
            interleavedRecruitments.push(recruitment);
            sourceMap.push("new");
            addedIds.add(recruitment.id);
            break;
          }
        }
      }

      // 次のラウンドでは別のアルゴリズムから先に選ぶ
      startWithOld = !startWithOld;
    }

    // 結果を保存して返す
    this.interleavingResult = {
      interleavedRecruitments,
      sourceMap,
      clicks: {},
    };
    this.cachedFilterKey = filterKey;

    return this.interleavingResult;
  }

  /**
   * インターリーブ結果からページネーションを適用する
   * @param page ページ番号（1から開始）
   * @param perPage 1ページあたりのアイテム数
   * @returns ページングされた結果
   */
  paginate(page: number, perPage: number): PaginationResult {
    if (!this.interleavingResult) {
      throw new Error("インターリーブが実行されていません");
    }

    const { interleavedRecruitments, sourceMap } = this.interleavingResult;

    // ページネーション処理
    const totalItems = interleavedRecruitments.length;
    const totalPages = Math.ceil(totalItems / perPage);
    const validPage = Math.max(1, Math.min(page, totalPages));
    const startIndex = (validPage - 1) * perPage;
    const endIndex = Math.min(startIndex + perPage, totalItems);

    // 現在のページの項目を取得
    const items = interleavedRecruitments.slice(startIndex, endIndex);
    const itemsSourceMap = sourceMap.slice(startIndex, endIndex);

    return {
      items,
      sourceMap: itemsSourceMap,
      totalPages,
      currentPage: validPage,
      perPage,
      totalItems,
    };
  }

  /**
   * ユーザーがクリックした募集を記録
   * @param recruitmentId クリックされた募集ID
   */
  recordClick(recruitmentId: number): void {
    if (!this.interleavingResult) {
      throw new Error("インターリーブが実行されていません");
    }

    const { interleavedRecruitments, sourceMap } = this.interleavingResult;

    // クリックされた募集のインデックスを特定
    const index = interleavedRecruitments.findIndex(
      (r) => r.id === recruitmentId
    );

    if (index !== -1) {
      // どちらのアルゴリズムからの募集かを記録
      const source = sourceMap[index];
      this.interleavingResult.clicks[recruitmentId] = source;
    }
  }

  /**
   * 現在の評価結果を分析して、どちらのアルゴリズムが優れているかを判定
   * @returns 評価結果の分析
   */
  analyzeResults(): {
    oldClicks: number; // 旧アルゴリズムがクリックされた回数
    newClicks: number; // 新アルゴリズムがクリックされた回数
    winner: "old" | "new" | "tie"; // 勝者（旧/新/引き分け）
    totalClicks: number; // 合計クリック数
  } {
    if (!this.interleavingResult) {
      throw new Error("インターリーブが実行されていません");
    }

    const { clicks } = this.interleavingResult;

    // クリック数を集計
    let oldClicks = 0;
    let newClicks = 0;

    Object.values(clicks).forEach((source) => {
      if (source === "old") oldClicks++;
      else if (source === "new") newClicks++;
    });

    const totalClicks = oldClicks + newClicks;

    // 勝者の判定
    let winner: "old" | "new" | "tie" = "tie";
    if (oldClicks > newClicks) winner = "old";
    else if (newClicks > oldClicks) winner = "new";

    return {
      oldClicks,
      newClicks,
      winner,
      totalClicks,
    };
  }

  /**
   * キャッシュをクリアする（フィルター変更時などに使用）
   */
  clearCache(): void {
    this.interleavingResult = null;
    this.cachedFilterKey = "";
  }
}

/**
 * APIリクエストを処理するサービスクラス
 *
 * フロー：
 * フィルタリングパラメータに基づいて募集を取得
 * フィルタを適用して募集データを絞り込む
 * インターリーブされたランキング結果をページネーションで取得
 * ユーザーがクリックした募集を記録
 * 現在のアルゴリズム評価結果を取得
 *
 */
class RecruitmentService {
  private balancedInterleaving: BalancedInterleaving;
  private cachedRecruitments: { [filterKey: string]: Recruitment[] } = {};

  constructor() {
    const oldAlgorithm = new OldRankingAlgorithm();
    const newAlgorithm = new NewRankingAlgorithm();
    this.balancedInterleaving = new BalancedInterleaving(
      oldAlgorithm,
      newAlgorithm
    );
  }

  /**
   * フィルタリングパラメータに基づいて募集を取得
   * @param filters フィルタリングパラメータ
   * @returns 募集データ
   */
  async fetchRecruitments(
    filters: Record<string, any> = {}
  ): Promise<Recruitment[]> {
    const filterKey = JSON.stringify(filters);

    // キャッシュに存在する場合はそれを返す
    if (this.cachedRecruitments[filterKey]) {
      return this.cachedRecruitments[filterKey];
    }

    try {
      // 実際のAPIリクエスト処理
      // この例ではモックデータを使用
      const mockData: Recruitment[] = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        title: `募集タイトル ${i + 1}`,
        company: `企業名 ${Math.floor(i / 5) + 1}`,
        score: Math.random() * 100,
      }));

      // フィルターを適用
      const filteredData = this.applyFilters(mockData, filters);

      // キャッシュに保存
      this.cachedRecruitments[filterKey] = filteredData;

      return filteredData;
    } catch (error) {
      console.error("募集データの取得に失敗しました:", error);
      return [];
    }
  }

  /**
   * フィルタを適用して募集データを絞り込む
   * @param recruitments 全募集データ
   * @param filters フィルタリングパラメータ
   * @returns フィルタリングされた募集データ
   */
  private applyFilters(
    recruitments: Recruitment[],
    filters: Record<string, any>
  ): Recruitment[] {
    let filtered = [...recruitments];

    if (filters.company) {
      filtered = filtered.filter((r) => r.company.includes(filters.company));
    }

    if (filters.title) {
      filtered = filtered.filter((r) => r.title.includes(filters.title));
    }

    // その他のフィルター条件を適用

    return filtered;
  }

  /**
   * インターリーブされたランキング結果をページネーションで取得
   * @param page ページ番号
   * @param perPage 1ページあたりのアイテム数
   * @param filters フィルタリングパラメータ
   */
  async getInterleavedRecruitments(
    page: number = 1,
    perPage: number = 20,
    filters: Record<string, any> = {}
  ): Promise<PaginationResult> {
    // フィルタリングキーを生成
    const filterKey = JSON.stringify(filters);

    // 募集データを取得
    const recruitments = await this.fetchRecruitments(filters);

    // インターリーブを実行
    this.balancedInterleaving.interleave(recruitments, filterKey);

    // ページネーションを適用
    return this.balancedInterleaving.paginate(page, perPage);
  }

  /**
   * ユーザーがクリックした募集を記録
   * @param recruitmentId クリックされた募集ID
   */
  recordClick(recruitmentId: number): void {
    this.balancedInterleaving.recordClick(recruitmentId);
  }

  /**
   * 現在のアルゴリズム評価結果を取得
   */
  getEvaluationResults() {
    return this.balancedInterleaving.analyzeResults();
  }

  /**
   * フィルター変更時などに使用するキャッシュクリア
   */
  clearCache(): void {
    this.cachedRecruitments = {};
    this.balancedInterleaving.clearCache();
  }
}
// testクラスへモジュールのエクスポート
export {
  Recruitment,
  RankingAlgorithm,
  InterleavingResult,
  PaginationResult,
  OldRankingAlgorithm,
  NewRankingAlgorithm,
  BalancedInterleaving,
  RecruitmentService,
};
