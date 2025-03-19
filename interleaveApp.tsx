import React, { useState, useEffect } from "react";
import {
  Recruitment,
  RecruitmentService,
  PaginationResult,
} from "./interleave";

// サービスのインスタンスを作成
const recruitmentService = new RecruitmentService();

const RecruitmentApp: React.FC = () => {
  // 状態管理
  const [paginationResult, setPaginationResult] =
    useState<PaginationResult | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [filters, setFilters] = useState<{ company: string; title: string }>({
    company: "",
    title: "",
  });
  const [filterInput, setFilterInput] = useState<{
    company: string;
    title: string;
  }>({ company: "", title: "" });
  const [perPage] = useState<number>(10);
  const [evaluationResults, setEvaluationResults] = useState<{
    oldClicks: number;
    newClicks: number;
    winner: "old" | "new" | "tie";
    totalClicks: number;
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // 募集データの取得
  const fetchRecruitments = async (): Promise<void> => {
    setLoading(true);
    try {
      const result = await recruitmentService.getInterleavedRecruitments(
        currentPage,
        perPage,
        filters
      );
      setPaginationResult(result);
    } catch (error) {
      console.error("募集データの取得に失敗しました:", error);
    } finally {
      setLoading(false);
    }
  };

  // 初回レンダリング時とページ/フィルター変更時にデータを取得
  useEffect(() => {
    fetchRecruitments();
  }, [currentPage, filters]);

  // 募集のクリックを記録
  const handleRecruitmentClick = (recruitment: Recruitment): void => {
    recruitmentService.recordClick(recruitment.id);
    updateEvaluationResults();
  };

  // 評価結果の更新
  const updateEvaluationResults = (): void => {
    const results = recruitmentService.getEvaluationResults();
    setEvaluationResults(results);
  };

  // フィルター適用
  const applyFilters = (): void => {
    setFilters({ ...filterInput });
    setCurrentPage(1); // フィルター変更時は1ページ目に戻る
  };

  // フィルターリセット
  const resetFilters = (): void => {
    setFilterInput({ company: "", title: "" });
    setFilters({ company: "", title: "" });
    recruitmentService.clearCache();
  };

  // ページ変更ハンドラー
  const handlePageChange = (newPage: number): void => {
    setCurrentPage(newPage);
  };

  if (loading && !paginationResult) {
    return <div className="loading">読み込み中...</div>;
  }

  return (
    <div className="recruitment-app">
      <h1>募集一覧</h1>

      {/* フィルターフォーム */}
      <div className="filter-form">
        <div className="form-group">
          <label>企業名:</label>
          <input
            type="text"
            value={filterInput.company}
            onChange={(e) =>
              setFilterInput({ ...filterInput, company: e.target.value })
            }
            placeholder="企業名で絞り込み"
          />
        </div>
        <div className="form-group">
          <label>タイトル:</label>
          <input
            type="text"
            value={filterInput.title}
            onChange={(e) =>
              setFilterInput({ ...filterInput, title: e.target.value })
            }
            placeholder="タイトルで絞り込み"
          />
        </div>
        <div className="filter-actions">
          <button onClick={applyFilters}>適用</button>
          <button onClick={resetFilters}>リセット</button>
        </div>
      </div>

      {/* 募集一覧 */}
      {paginationResult && (
        <div className="recruitment-list">
          <p>
            全{paginationResult.totalItems}件中{" "}
            {(currentPage - 1) * perPage + 1}～
            {Math.min(currentPage * perPage, paginationResult.totalItems)}
            件を表示
          </p>

          <table className="recruitment-table">
            <thead>
              <tr>
                <th>順位</th>
                <th>タイトル</th>
                <th>企業名</th>
                <th>スコア</th>
                <th>アルゴリズム</th>
              </tr>
            </thead>
            <tbody>
              {paginationResult.items.map((recruitment, index) => (
                <tr
                  key={recruitment.id}
                  onClick={() => handleRecruitmentClick(recruitment)}
                  className="clickable-row"
                >
                  <td>{(currentPage - 1) * perPage + index + 1}</td>
                  <td>{recruitment.title}</td>
                  <td>{recruitment.company}</td>
                  <td>{Math.round(recruitment.score)}</td>
                  <td className={paginationResult.sourceMap[index]}>
                    {paginationResult.sourceMap[index] === "old"
                      ? "旧アルゴリズム"
                      : "新アルゴリズム"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ページネーション */}
          <div className="pagination">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              前へ
            </button>
            {Array.from(
              { length: paginationResult.totalPages },
              (_, i) => i + 1
            ).map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={page === currentPage ? "active" : ""}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === paginationResult.totalPages}
            >
              次へ
            </button>
          </div>
        </div>
      )}

      {/* 評価結果 */}
      {evaluationResults && (
        <div className="evaluation-results">
          <h2>アルゴリズム評価結果</h2>
          <p>旧アルゴリズムのクリック数: {evaluationResults.oldClicks}</p>
          <p>新アルゴリズムのクリック数: {evaluationResults.newClicks}</p>
          <p>合計クリック数: {evaluationResults.totalClicks}</p>
          <p>
            現在の勝者:{" "}
            {evaluationResults.winner === "tie"
              ? "引き分け"
              : evaluationResults.winner === "old"
              ? "旧アルゴリズム"
              : "新アルゴリズム"}
          </p>
        </div>
      )}
    </div>
  );
};

export default RecruitmentApp;
